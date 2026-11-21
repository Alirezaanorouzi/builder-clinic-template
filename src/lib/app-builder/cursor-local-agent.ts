import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"

import { JsonlLocalAgentStore, type LocalAgentOptions } from "@cursor/sdk"

import { resolveAppBuilderRoot } from "./workspace-paths"

/**
 * Vercel functions only allow writes under `/tmp`. The default local store uses
 * SQLite under `~/.cursor/projects/...`, which fails with ENOENT on serverless.
 * @see https://cursor.com/docs/sdk/typescript#jsonl-store
 */
export function ensureCursorServerlessPaths(): void {
  if (!process.env.VERCEL) {
    return
  }

  const tmp = os.tmpdir()
  const home = process.env.HOME?.trim()
  if (!home || home.includes("sbx_user")) {
    process.env.HOME = tmp
  }

  if (!process.env.CURSOR_DATA_DIR?.trim()) {
    process.env.CURSOR_DATA_DIR = path.join(tmp, ".cursor-data")
  }
}

/** SDK also writes under `~/.cursor/projects/{workspace-slug}/sdk-agent-store`. */
export function workspaceRefSlug(workspaceRef: string): string {
  return workspaceRef
    .replace(/^\/+/, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function ensureSdkAgentStateDirs(workspaceRef: string): Promise<void> {
  ensureCursorServerlessPaths()
  const home = process.env.HOME?.trim() || os.tmpdir()
  const slug = workspaceRefSlug(workspaceRef)
  await fs.mkdir(
    path.join(home, ".cursor", "projects", slug, "sdk-agent-store"),
    { recursive: true }
  )
  await fs.mkdir(path.join(home, ".cursor", "projects", slug), {
    recursive: true,
  })
}

export function resolveAgentStoreDir(options: {
  projectId?: string
  sessionId: string
}): string {
  const key = options.projectId ?? options.sessionId
  return path.join(resolveAppBuilderRoot(), "agent-stores", key)
}

export async function createJsonlAgentStore(options: {
  projectId?: string
  sessionId: string
}): Promise<JsonlLocalAgentStore> {
  const root = resolveAgentStoreDir(options)
  await fs.mkdir(root, { recursive: true })
  return new JsonlLocalAgentStore(root)
}

export async function buildLocalAgentOptions(options: {
  cwd: string
  projectId?: string
  sessionId: string
}): Promise<LocalAgentOptions> {
  await ensureSdkAgentStateDirs(options.cwd)
  return {
    cwd: options.cwd,
    settingSources: [],
    store: await createJsonlAgentStore({
      projectId: options.projectId,
      sessionId: options.sessionId,
    }),
  }
}