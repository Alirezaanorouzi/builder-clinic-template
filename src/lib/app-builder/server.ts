import { randomUUID } from "node:crypto"
import { promises as fs } from "node:fs"
import path from "node:path"

import {
  Agent,
  Cursor,
  type ModelSelection,
  type Run,
  type SDKAgent,
  type SDKMessage,
  type SDKModel,
} from "@cursor/sdk"

import { requireMultiUserMode } from "@/lib/auth/config"
import { getProjectByBuilderSessionId } from "@/lib/db/projects"

import { isRecognizedCursorApiKey, normalizeCursorApiKey } from "./api-key"
import { provisionPreviewRuntime } from "./preview"
import type { PreviewRuntimeHandle } from "./preview/types"
import { getBuilderSessionRegistry } from "./session-registry"
import { generatedAppFiles } from "./template"
import { buildLocalAgentOptions } from "./cursor-local-agent"
import { resolveAppBuilderRoot } from "./workspace-paths"

type BuilderSession = {
  id: string
  projectId?: string
  apiKey: string
  models: ModelCatalogItem[]
  user: PublicUser | null
  projectPath: string
  previewUrl: string
  port: number
  logs: string[]
  ready: Promise<void>
  previewHandle?: PreviewRuntimeHandle
  agent?: SDKAgent
  setupError?: string
}

type PersistedSettings = {
  cursorApiKey?: string
}

export type PublicSession = {
  id: string
  previewUrl: string
  projectPath: string
  previewRuntime: "sandbox"
  models: ModelCatalogItem[]
  user: PublicUser | null
}

export type PublicUser = {
  name: string
  email?: string
}

export type ModelCatalogItem = {
  id: string
  label: string
  description?: string
  parameters: ModelParameterConfig[]
  defaultParams: ModelParamConfig[]
}

export type ModelParameterConfig = {
  id: string
  label: string
  values: ModelParameterValueConfig[]
}

export type ModelParameterValueConfig = {
  id: string
  label: string
}

export type ModelParamConfig = {
  id: string
  value: string
}

export class InvalidCursorApiKeyError extends Error {
  readonly code = "invalid_api_key"

  constructor(message = "The Cursor API key could not be validated.") {
    super(message)
    this.name = "InvalidCursorApiKeyError"
  }
}

export class UnknownAppBuilderSessionError extends Error {
  readonly code = "unknown_session"

  constructor(
    message = "Unknown app builder session. Create a new session first."
  ) {
    super(message)
    this.name = "UnknownAppBuilderSessionError"
  }
}

export class ProjectNameGenerationTimeoutError extends Error {
  readonly code = "project_name_timeout"

  constructor(message = "Project name generation timed out. Try again.") {
    super(message)
    this.name = "ProjectNameGenerationTimeoutError"
  }
}

export type AgentStreamEvent =
  | { type: "assistant_delta"; text: string }
  | { type: "thinking"; id?: string; text: string }
  | {
      type: "tool_call"
      callId?: string
      name: string
      status: string
      args?: unknown
      truncatedArgs?: boolean
    }
  | { type: "status"; status: string; message?: string }
  | { type: "task"; status?: string; text?: string }

export type ProjectNameMessage = {
  role: "assistant" | "user"
  content: string
}

type ProjectNameContext = {
  prompt?: string
  messages?: ProjectNameMessage[]
}

const appBuilderRoot = resolveAppBuilderRoot()
const workspaceRoot = path.join(appBuilderRoot, "sessions")
const settingsPath = path.join(appBuilderRoot, "settings.json")
const DEFAULT_PROJECT_NAME_TIMEOUT_MS = 15_000
const APP_BUILDER_INSTRUCTIONS = [
  "You are building a local Next.js React TypeScript application (App Router) for a live preview product.",
  "Edit files directly in the current workspace. The dev server is already running and hot reloads when files change.",
  "Keep changes focused on the user's requested app. Prefer small, working iterations over broad rewrites.",
  "Do not start another long-running dev server unless the existing preview server is broken.",
]

const fallbackModels: ModelCatalogItem[] = [
  {
    id: "auto",
    label: "Auto",
    parameters: [],
    defaultParams: [],
  },
  {
    id: "composer-2",
    label: "Composer 2",
    parameters: [],
    defaultParams: [],
  },
]

const sessions = getBuilderSessionRegistry<BuilderSession>()
const attachSessionInFlight = new Map<string, Promise<void>>()

export async function readPersistedCursorApiKey(): Promise<string | null> {
  const settings = await readPersistedSettings()
  const fromSettings = settings.cursorApiKey
    ? normalizeCursorApiKey(settings.cursorApiKey)
    : ""
  if (fromSettings && isRecognizedCursorApiKey(fromSettings)) {
    return fromSettings
  }

  const fromEnv = process.env.CURSOR_API_KEY
    ? normalizeCursorApiKey(process.env.CURSOR_API_KEY)
    : ""
  if (fromEnv && isRecognizedCursorApiKey(fromEnv)) {
    return fromEnv
  }

  return null
}

export async function savePersistedCursorApiKey(apiKey: string) {
  const settings = await readPersistedSettings()
  settings.cursorApiKey = apiKey
  await writePersistedSettings(settings)
}

export async function validateCursorApiKey(apiKey: string) {
  try {
    await Cursor.me({ apiKey })
  } catch {
    throw new InvalidCursorApiKeyError(
      "The Cursor API key could not be validated. Please check the key and try again."
    )
  }
}

export async function clearPersistedCursorApiKey() {
  const settings = await readPersistedSettings()
  delete settings.cursorApiKey

  if (Object.keys(settings).length === 0) {
    await fs.unlink(settingsPath).catch((error: unknown) => {
      if (!isNodeFileError(error) || error.code !== "ENOENT") {
        throw error
      }
    })
    return
  }

  await writePersistedSettings(settings)
}

export async function createSession(
  apiKey: string,
  options?: { projectId?: string }
): Promise<PublicSession> {
  const id = randomUUID()
  const projectPath = options?.projectId
    ? path.join(workspaceRoot, "projects", options.projectId, "app")
    : path.join(workspaceRoot, id, "app")
  const modelsPromise = listModels(apiKey)
  const userPromise = getCurrentUser(apiKey)
  const session: BuilderSession = {
    id,
    projectId: options?.projectId,
    apiKey,
    models: fallbackModels,
    user: null,
    projectPath,
    port: 0,
    previewUrl: "",
    logs: [],
    ready: Promise.resolve(),
  }

  sessions.set(id, session)
  const readyPromise = prepareSession(session).catch((error: unknown) => {
    const message = getErrorMessage(error)
    session.setupError = message
    session.logs.push(`[setup] ${message}`)
    throw error
  })
  session.ready = readyPromise
  const [models, user] = await Promise.all([
    modelsPromise,
    userPromise,
    readyPromise,
  ])
  session.models = models
  session.user = user

  return toPublicSession(session)
}

/**
 * Serverless instances lose in-memory sessions between invocations. Multi-user
 * projects store builderSessionId in Neon — rebuild RAM state before chat APIs run.
 */
export async function attachBuilderSessionIfMissing(
  sessionId: string,
  apiKey: string
): Promise<void> {
  if (sessions.has(sessionId)) {
    return
  }

  const inflight = attachSessionInFlight.get(sessionId)
  if (inflight) {
    await inflight
    return
  }

  const work = (async () => {
    if (sessions.has(sessionId)) {
      return
    }
    if (!requireMultiUserMode()) {
      throw new UnknownAppBuilderSessionError()
    }

    const project = await getProjectByBuilderSessionId(sessionId)
    if (!project?.id || project.provisionStatus !== "ready") {
      throw new UnknownAppBuilderSessionError()
    }

    await materializeBuilderSession({
      sessionId,
      apiKey,
      projectId: project.id,
      previewUrlHint: project.previewUrl ?? undefined,
    })
  })()

  attachSessionInFlight.set(sessionId, work)
  try {
    await work
  } finally {
    attachSessionInFlight.delete(sessionId)
  }
}

async function materializeBuilderSession(options: {
  sessionId: string
  apiKey: string
  projectId: string
  previewUrlHint?: string
}): Promise<BuilderSession> {
  const existing = sessions.get(options.sessionId)
  if (existing) {
    return existing
  }

  const projectPath = path.join(
    workspaceRoot,
    "projects",
    options.projectId,
    "app"
  )
  const modelsPromise = listModels(options.apiKey)
  const userPromise = getCurrentUser(options.apiKey)
  const session: BuilderSession = {
    id: options.sessionId,
    projectId: options.projectId,
    apiKey: options.apiKey,
    models: fallbackModels,
    user: null,
    projectPath,
    port: 0,
    previewUrl: options.previewUrlHint ?? "",
    logs: [],
    ready: Promise.resolve(),
  }

  sessions.set(options.sessionId, session)
  const readyPromise = prepareSession(session).catch((error: unknown) => {
    const message = getErrorMessage(error)
    session.setupError = message
    session.logs.push(`[setup] ${message}`)
    sessions.delete(options.sessionId)
    throw error
  })
  session.ready = readyPromise

  const [models, user] = await Promise.all([
    modelsPromise,
    userPromise,
    readyPromise,
  ])
  session.models = models
  session.user = user
  return session
}

export async function restoreSession(
  sessionId: string,
  apiKey: string
): Promise<PublicSession> {
  if (!sessions.has(sessionId)) {
    await attachBuilderSessionIfMissing(sessionId, apiKey)
  }

  const session = sessions.get(sessionId)

  if (!session) {
    throw new UnknownAppBuilderSessionError()
  }

  if (apiKey !== session.apiKey) {
    await updateSessionApiKey(session, apiKey)
  } else if (!session.user) {
    session.user = await getCurrentUser(apiKey)
  }

  await session.ready
  assertSessionReady(session)
  return toPublicSession(session)
}

export async function getPublicSession(
  id: string,
  options?: { apiKey?: string }
): Promise<PublicSession> {
  if (!sessions.has(id)) {
    if (!options?.apiKey) {
      throw new UnknownAppBuilderSessionError()
    }
    await attachBuilderSessionIfMissing(id, options.apiKey)
  }
  const session = getSession(id)
  await session.ready
  assertSessionReady(session)
  return toPublicSession(session)
}

export async function streamAgentResponse(
  sessionId: string,
  userMessage: string,
  model: string | undefined,
  emit: (event: AgentStreamEvent) => void
) {
  const session = getSession(sessionId)
  await session.ready
  assertSessionReady(session)

  const agent = await getOrCreateAgent(session)
  const modelSelection = model
    ? encodeLocalSdkModelSelection(parseModelSelection(model), session.models)
    : undefined
  const run = await agent.send(
    buildPrompt(userMessage, session),
    modelSelection ? { model: modelSelection } : undefined
  )

  for await (const event of run.stream()) {
    emitSdkMessage(event, emit)
  }

  await run.wait()

  if (session.previewHandle?.kind === "sandbox") {
    await session.previewHandle.syncFromWorkspace(session.projectPath)
  }
}

export async function generateProjectName(
  sessionId: string,
  context: string | ProjectNameContext
): Promise<string> {
  const session = getSession(sessionId)
  return generateProjectNameForApiKey(session.apiKey, context)
}

async function generateProjectNameForApiKey(
  apiKey: string,
  context: string | ProjectNameContext
): Promise<string> {
  const nameContext = normalizeProjectNameContext(context)
  if (!nameContext.prompt && !nameContext.messages.length) {
    throw new Error("Conversation context is required to generate a project name.")
  }

  try {
    const title = await promptProjectNameWithXml(apiKey, nameContext)

    if (title) {
      return title
    }
  } catch {
    // Naming is a convenience feature; use a local fallback when the model path fails.
  }

  const fallbackTitle = generateFallbackProjectName(nameContext)
  if (!fallbackTitle) {
    throw new Error("Could not generate a project name from this conversation.")
  }

  return fallbackTitle
}

async function promptProjectNameWithXml(
  apiKey: string,
  context: Required<ProjectNameContext>
) {
  let timeout: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new ProjectNameGenerationTimeoutError())
    }, getProjectNameTimeoutMs())
  })

  const agent = await Agent.create({
    apiKey,
    model: { id: process.env.CURSOR_PROJECT_NAME_MODEL ?? "composer-2" },
    local: await buildLocalAgentOptions({
      cwd: process.cwd(),
      sessionId: `project-name-${randomUUID()}`,
    }),
  })

  try {
    const run = await agent.send(buildProjectNamePrompt(context))

    return await Promise.race([
      collectProjectNameRun(run, context),
      timeoutPromise,
    ])
  } finally {
    if (timeout) {
      clearTimeout(timeout)
    }
    agent.close()
  }
}

async function collectProjectNameRun(
  run: Run,
  context: Required<ProjectNameContext>
) {
  let assistantText = ""

  for await (const event of run.stream()) {
    if (event.type === "assistant") {
      for (const block of event.message.content) {
        if (block.type === "text") {
          assistantText += block.text
        }
      }
    }
  }

  const result = await run.wait()
  const rawName = extractProjectNameXml(
    assistantText || result.result || generateFallbackProjectName(context)
  )
  const sanitized = sanitizeProjectName(rawName)
  return sanitized
}

function extractProjectNameXml(value: string) {
  return (
    value.match(/<projectName>\s*([\s\S]*?)\s*<\/projectName>/i)?.[1]?.trim() ??
    ""
  )
}

function getProjectNameTimeoutMs() {
  const value = Number(process.env.CURSOR_PROJECT_NAME_TIMEOUT_MS)
  return Number.isFinite(value) && value > 0
    ? value
    : DEFAULT_PROJECT_NAME_TIMEOUT_MS
}

function normalizeProjectNameContext(
  context: string | ProjectNameContext
): Required<ProjectNameContext> {
  if (typeof context === "string") {
    return {
      prompt: compactProjectNameContent(context),
      messages: [],
    }
  }

  const messages = (context.messages ?? [])
    .filter((message) => message.role === "assistant" || message.role === "user")
    .map((message) => ({
      role: message.role,
      content: compactProjectNameContent(message.content).slice(0, 600),
    }))
    .filter((message) => message.content)

  return {
    prompt: compactProjectNameContent(context.prompt ?? ""),
    messages: messages.slice(-16),
  }
}

function compactProjectNameContent(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function getSession(id: string) {
  const session = sessions.get(id)
  if (!session) {
    throw new UnknownAppBuilderSessionError()
  }
  return session
}

function buildProjectNamePrompt(context: Required<ProjectNameContext>) {
  const lines = [
    "You name app-builder projects.",
    "Create a concise sidebar project name for this app-building conversation.",
    "Rules:",
    "- Return exactly one XML tag: <projectName>Concise Name</projectName>.",
    "- The project name inside the tag must use 2 to 5 words.",
    "- No quotes, markdown, emoji, trailing punctuation, or generic words like Project inside the tag.",
    "- Do not include names, usernames, or email addresses.",
    "- Prefer nouns that describe the app being built.",
    "",
  ]

  if (context.messages.length > 0) {
    lines.push(
      "Conversation:",
      ...context.messages.map(
        (message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`
      )
    )
  } else {
    lines.push("Initial user request:", context.prompt.slice(0, 1200))
  }

  return lines.join("\n")
}

function sanitizeProjectName(value: string) {
  const firstLine = value
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean)

  if (!firstLine) {
    return ""
  }

  const cleaned = firstLine
    .replace(/^project\s*name\s*:\s*/i, "")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "")
    .replace(/[`*_#>]+/g, "")
    .replace(/^[-\s"']+|[-\s"'.:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()

  if (!cleaned) {
    return ""
  }

  const words = cleaned.split(" ").slice(0, 5).join(" ")
  return words.length > 42 ? `${words.slice(0, 39).trim()}...` : words
}

function generateFallbackProjectName(context: Required<ProjectNameContext>) {
  const source =
    context.messages.find((message) => message.role === "user")?.content ??
    context.prompt
  const cleaned = sanitizeProjectName(
    source
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "")
      .replace(/https?:\/\/\S+/gi, "")
      .replace(/[`*_#>]+/g, "")
      .replace(/[^a-z0-9\s-]/gi, " ")
      .replace(/\b(?:a|an|and|app|application|build|create|for|i|me|my|of|please|project|the|to|want|with)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
  )

  return cleaned || "Untitled App"
}

async function readPersistedSettings(): Promise<PersistedSettings> {
  try {
    const raw = await fs.readFile(settingsPath, "utf8")
    const parsed = JSON.parse(raw) as PersistedSettings

    if (!parsed || typeof parsed !== "object") {
      return {}
    }

    return {
      cursorApiKey:
        typeof parsed.cursorApiKey === "string"
          ? parsed.cursorApiKey
          : undefined,
    }
  } catch (error) {
    if (isNodeFileError(error) && error.code === "ENOENT") {
      return {}
    }

    return {}
  }
}

async function writePersistedSettings(settings: PersistedSettings) {
  await fs.mkdir(appBuilderRoot, { recursive: true })
  await fs.writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, {
    mode: 0o600,
  })
  await fs.chmod(settingsPath, 0o600).catch(() => {})
}

function isNodeFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error
}

function toPublicSession(session: BuilderSession): PublicSession {
  return {
    id: session.id,
    previewUrl: session.previewUrl,
    projectPath: session.projectPath,
    previewRuntime: session.previewHandle?.kind ?? "sandbox",
    models: session.models,
    user: session.user,
  }
}

async function updateSessionApiKey(session: BuilderSession, apiKey: string) {
  session.apiKey = apiKey
  session.agent = undefined

  const [models, user] = await Promise.all([
    listModels(apiKey),
    getCurrentUser(apiKey),
  ])
  session.models = models
  session.user = user
}

async function getCurrentUser(apiKey: string): Promise<PublicUser | null> {
  try {
    const user = asRecord(await Cursor.me({ apiKey }))
    const name =
      firstString(user, ["name", "displayName", "username"]) ??
      firstString(user, ["apiKeyName", "userEmail"]) ??
      "Cursor user"
    const email = firstString(user, ["email", "userEmail"])

    return {
      name,
      email,
    }
  } catch {
    return null
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {}
}

function firstString(
  record: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }

  return undefined
}

async function listModels(apiKey: string): Promise<ModelCatalogItem[]> {
  try {
    const models = await Cursor.models.list({ apiKey })
    const catalog = sanitizeModelCatalog(models.map(modelToCatalogItem))
    return catalog.length > 0 ? catalog : fallbackModels
  } catch {
    return fallbackModels
  }
}

function modelToCatalogItem(model: SDKModel): ModelCatalogItem {
  return {
    id: model.id,
    label: model.displayName || model.id,
    description: model.description,
    parameters: buildModelParameters(model),
    defaultParams: getDefaultModelParams(model),
  }
}

function buildModelParameters(model: SDKModel): ModelParameterConfig[] {
  const parameters = new Map<string, ModelParameterConfig>()

  for (const parameter of model.parameters ?? []) {
    parameters.set(parameter.id, {
      id: parameter.id,
      label: parameter.displayName || labelFromId(parameter.id),
      values: parameter.values.map((value) => ({
        id: value.value,
        label: value.displayName || labelFromId(value.value),
      })),
    })
  }

  for (const variant of model.variants ?? []) {
    for (const param of variant.params) {
      const parameter = parameters.get(param.id) ?? {
        id: param.id,
        label: labelFromId(param.id),
        values: [],
      }

      if (!parameter.values.some((value) => value.id === param.value)) {
        parameter.values.push({
          id: param.value,
          label: labelFromId(param.value),
        })
      }

      parameters.set(param.id, parameter)
    }
  }

  return Array.from(parameters.values()).filter(
    (parameter) => parameter.values.length > 0
  )
}

function getDefaultModelParams(model: SDKModel): ModelParamConfig[] {
  const defaultVariant =
    model.variants?.find((variant) => variant.isDefault) ?? model.variants?.[0]

  return (defaultVariant?.params ?? []).map((param) => ({
    id: param.id,
    value: param.value,
  }))
}

function sanitizeModelCatalog(models: ModelCatalogItem[]) {
  const byId = new Map<string, ModelCatalogItem>()
  for (const model of models) {
    if (!byId.has(model.id)) {
      byId.set(model.id, model)
    }
  }

  return Array.from(byId.values())
}

function labelFromId(id: string) {
  return id
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function parseModelSelection(value: string): ModelSelection {
  try {
    const parsed = JSON.parse(value) as Partial<ModelSelection>
    if (typeof parsed.id === "string") {
      return {
        id: parsed.id,
        params: Array.isArray(parsed.params) ? parsed.params : undefined,
      }
    }
  } catch {}

  return { id: fallbackModels[0].id }
}

function encodeLocalSdkModelSelection(
  selection: ModelSelection,
  models: ModelCatalogItem[]
): ModelSelection {
  if (!selection.params?.length && isEncodedLocalModelId(selection.id)) {
    return { id: selection.id }
  }

  const model = models.find((item) => item.id === selection.id)
  const config = getSelectedModelConfig(selection, model)
  const modelKey = normalizeModelToken(
    `${selection.id} ${model?.label ?? ""}`
  )
  const encodedId =
    encodeKnownLocalModelId(modelKey, selection.id, config) ?? selection.id

  // Local runtime expects variant configuration encoded into the model id.
  return { id: encodedId }
}

function isEncodedLocalModelId(id: string) {
  return (
    /^gpt-5\.4-(none|low|medium|high|xhigh)(-fast)?$/.test(id) ||
    /^gpt-5\.3-codex(-(low|high|xhigh))?(-fast)?$/.test(id) ||
    /^claude-4\.6-sonnet-(medium|high)(-thinking)?$/.test(id) ||
    /^claude-4\.6-opus-(high|max)(-thinking)?(-fast)?$/.test(id)
  )
}

function encodeKnownLocalModelId(
  modelKey: string,
  fallbackId: string,
  config: SelectedModelConfig
) {
  if (modelKey.includes("gpt54") || modelKey.includes("gpt5.4")) {
    const effort = config.effort ?? "medium"
    const supportsFast = ["medium", "high", "xhigh"].includes(effort)
    return `gpt-5.4-${effort}${config.fast && supportsFast ? "-fast" : ""}`
  }

  if (modelKey.includes("gpt53codex") || modelKey.includes("gpt5.3codex")) {
    const effort = config.effort ?? "medium"
    const effortSuffix = effort === "medium" ? "" : `-${effort}`
    const supportsFast = ["medium", "high", "xhigh"].includes(effort)
    return `gpt-5.3-codex${effortSuffix}${
      config.fast && supportsFast ? "-fast" : ""
    }`
  }

  if (modelKey.includes("claude46sonnet") || modelKey.includes("claude4.6sonnet")) {
    const effort = config.effort === "high" ? "high" : "medium"
    return `claude-4.6-sonnet-${effort}${config.thinking ? "-thinking" : ""}`
  }

  if (modelKey.includes("claude46opus") || modelKey.includes("claude4.6opus")) {
    const effort = config.effort === "max" ? "max" : "high"
    const supportsVariants = effort === "high"
    return `claude-4.6-opus-${effort}${
      config.thinking && supportsVariants ? "-thinking" : ""
    }${config.fast && supportsVariants ? "-fast" : ""}`
  }

  return fallbackId
}

type SelectedModelConfig = {
  effort?: "none" | "low" | "medium" | "high" | "xhigh" | "max"
  fast: boolean
  thinking: boolean
}

function getSelectedModelConfig(
  selection: ModelSelection,
  model: ModelCatalogItem | undefined
): SelectedModelConfig {
  const config: SelectedModelConfig = { fast: false, thinking: false }

  for (const param of selection.params ?? []) {
    const parameter = model?.parameters.find((item) => item.id === param.id)
    const value = parameter?.values.find((item) => item.id === param.value)
    const parameterKey = normalizeModelToken(
      `${param.id} ${parameter?.label ?? ""}`
    )
    const valueKey = normalizeModelToken(`${param.value} ${value?.label ?? ""}`)
    const effort = getEffortValue(valueKey)

    if (effort) {
      config.effort = effort
    }

    if (isEnabledVariant(parameterKey, valueKey, "fast")) {
      config.fast = true
    }

    if (isEnabledVariant(parameterKey, valueKey, "thinking")) {
      config.thinking = true
    }
  }

  return config
}

function getEffortValue(valueKey: string): SelectedModelConfig["effort"] {
  if (valueKey.includes("none")) {
    return "none"
  }

  if (valueKey.includes("xhigh") || valueKey.includes("extrahigh")) {
    return "xhigh"
  }

  if (valueKey.includes("max")) {
    return "max"
  }

  if (valueKey.includes("high")) {
    return "high"
  }

  if (valueKey.includes("medium")) {
    return "medium"
  }

  if (valueKey.includes("low")) {
    return "low"
  }

  return undefined
}

function isEnabledVariant(
  parameterKey: string,
  valueKey: string,
  variant: "fast" | "thinking"
) {
  if (!parameterKey.includes(variant) && !valueKey.includes(variant)) {
    return false
  }

  return !isFalseValue(valueKey)
}

function isFalseValue(valueKey: string) {
  return (
    valueKey.includes("false") ||
    valueKey.includes("off") ||
    valueKey.includes("disabled") ||
    valueKey.includes("disable") ||
    valueKey.includes("no")
  )
}

function normalizeModelToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9.]+/g, "")
}

async function prepareSession(session: BuilderSession) {
  await fs.mkdir(session.projectPath, { recursive: true })
  await writeGeneratedApp(session.projectPath)

  const handle = await provisionPreviewRuntime({
    id: session.id,
    projectId: session.projectId,
    projectPath: session.projectPath,
    logs: session.logs,
    pushLog: (line) => {
      const trimmed = line.trimEnd()
      if (!trimmed) {
        return
      }
      session.logs.push(trimmed)
      session.logs.splice(0, Math.max(0, session.logs.length - 200))
    },
  })

  session.previewHandle = handle
  session.previewUrl = handle.previewUrl
  session.port = handle.port
}

async function writeGeneratedApp(projectPath: string) {
  await Promise.all(
    generatedAppFiles.map(async (file) => {
      const filePath = path.join(projectPath, file.path)
      await fs.mkdir(path.dirname(filePath), { recursive: true })
      await fs.writeFile(filePath, file.content)
    })
  )
}

async function getOrCreateAgent(session: BuilderSession) {
  assertSessionReady(session)

  if (session.agent) {
    return session.agent
  }

  session.agent = await Agent.create({
    apiKey: session.apiKey,
    model: { id: process.env.CURSOR_MODEL ?? "composer-2" },
    local: await buildLocalAgentOptions({
      cwd: session.projectPath,
      projectId: session.projectId,
      sessionId: session.id,
    }),
    ...(session.projectId
      ? { agentId: `app-builder-project-${session.projectId}` }
      : {}),
  })

  return session.agent
}

function assertSessionReady(session: BuilderSession) {
  if (session.setupError) {
    throw new Error(`Preview setup failed: ${session.setupError}`)
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function buildPrompt(userMessage: string, session: BuilderSession) {
  return [
    ...APP_BUILDER_INSTRUCTIONS,
    "",
    `Preview URL: ${session.previewUrl}`,
    `Workspace: ${session.projectPath}`,
    "",
    "User request:",
    userMessage,
  ].join("\n")
}

function emitSdkMessage(
  event: SDKMessage,
  emit: (event: AgentStreamEvent) => void
) {
  switch (event.type) {
    case "assistant":
      for (const block of event.message.content) {
        if (block.type === "text") {
          emit({ type: "assistant_delta", text: block.text })
        } else {
          emit({
            type: "tool_call",
            callId: block.id,
            name: block.name,
            status: "requested",
            args: block.input,
          })
        }
      }
      break
    case "thinking": {
      const thinkingId =
        "id" in event && typeof event.id === "string" ? event.id : undefined
      emit({ type: "thinking", id: thinkingId, text: event.text })
      break
    }
    case "tool_call":
      emit({
        type: "tool_call",
        callId: event.call_id,
        name: event.name,
        status: event.status,
        args: event.args,
        truncatedArgs: event.truncated?.args,
      })
      break
    case "status":
      emit({ type: "status", status: event.status, message: event.message })
      break
    case "task":
      emit({ type: "task", status: event.status, text: event.text })
      break
    default:
      break
  }
}
