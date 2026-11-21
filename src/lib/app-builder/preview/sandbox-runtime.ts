import { randomUUID } from "node:crypto"

import { Sandbox } from "@vercel/sandbox"

import { loadSandboxAgentRunnerFiles } from "../sandbox/sandbox-agent-files"
import { generatedAppFiles } from "../template"
import {
  SANDBOX_AGENT_RUNNER_PORT,
  SANDBOX_KEEP_LAST_SNAPSHOTS,
  SANDBOX_PREVIEW_PORT,
  SANDBOX_SERVICE_READY_TIMEOUT_MS,
  SANDBOX_VM_SESSION_BOOTSTRAP_MS,
  SANDBOX_VM_SESSION_TIMEOUT_MS,
  SANDBOX_VITE_READY_TIMEOUT_MS,
  sandboxNameForSession,
  sandboxPersistentEnabled,
} from "./config"
import { collectWorkspaceFiles } from "./workspace-files"
import { sandboxCredentialsFromEnv } from "./sandbox-credentials"
import type { PreviewRuntimeHandle, PreviewSessionContext } from "./types"

const SANDBOX_WORKDIR = "/vercel/sandbox"

async function ensureSandboxWorkspace(sandbox: Sandbox) {
  const ready = await sandbox.runCommand({
    cmd: "bash",
    args: [
      "-c",
      `mkdir -p ${SANDBOX_WORKDIR} && test -d ${SANDBOX_WORKDIR} && echo ok`,
    ],
  })

  if (!(await ready.stdout()).includes("ok")) {
    const stderr = await ready.stderr()
    throw new Error(
      `Sandbox workspace could not be created: ${stderr || `exit ${ready.exitCode}`}`
    )
  }
}

async function writeTemplateToSandbox(sandbox: Sandbox) {
  await sandbox.writeFiles(
    generatedAppFiles.map((file) => ({
      path: file.path,
      content: Buffer.from(file.content, "utf8"),
    }))
  )
}

async function writeAgentRunnerToSandbox(sandbox: Sandbox) {
  const files = await loadSandboxAgentRunnerFiles()
  await sandbox.writeFiles(files)
}

async function runNpmInstall(
  sandbox: Sandbox,
  pushLog: (line: string) => void
) {
  pushLog("npm install started (can take 10–30+ minutes on a cold sandbox)…")

  const install = await sandbox.runCommand({
    cmd: "npm",
    args: ["install", "--no-audit", "--no-fund", "--prefer-offline"],
    cwd: SANDBOX_WORKDIR,
  })

  const stderr = await install.stderr()
  const stdout = await install.stdout()
  if (stdout) {
    pushLog(stdout)
  }
  if (stderr) {
    pushLog(stderr)
  }

  if (install.exitCode !== 0) {
    throw new Error(`npm install failed in sandbox (exit ${install.exitCode})`)
  }
}

async function startNextDevDetached(sandbox: Sandbox) {
  await sandbox.runCommand({
    cmd: "npm",
    args: [
      "run",
      "dev",
      "--",
      "-p",
      String(SANDBOX_PREVIEW_PORT),
      "-H",
      "0.0.0.0",
    ],
    cwd: SANDBOX_WORKDIR,
    detached: true,
  })
}

async function startAgentRunnerDetached(
  sandbox: Sandbox,
  env: Record<string, string>
) {
  await sandbox.runCommand({
    cmd: "node",
    args: ["agent-runner.mjs"],
    cwd: SANDBOX_WORKDIR,
    detached: true,
    env,
  })
}

async function waitForSandboxPort(
  sandbox: Sandbox,
  port: number,
  pushLog: (line: string) => void,
  pathCheck = "/",
  timeoutMs = SANDBOX_VITE_READY_TIMEOUT_MS
) {
  const startedAt = Date.now()
  let lastProgressLog = startedAt

  while (Date.now() - startedAt < timeoutMs) {
    const curlPath = pathCheck === "/health" ? "/health" : "/"
    const ping = await sandbox.runCommand({
      cmd: "bash",
      args: [
        "-c",
        `(ss -tln 2>/dev/null | grep -q ":${port} " && echo up) || (curl -sS --connect-timeout 2 -m 5 http://127.0.0.1:${port}${curlPath} -o /dev/null >/dev/null 2>&1 && echo up) || true`,
      ],
    })
    if ((await ping.stdout()).includes("up")) {
      return
    }

    if (Date.now() - lastProgressLog > 15_000) {
      const elapsedSec = Math.round((Date.now() - startedAt) / 1000)
      pushLog(`waiting for port ${port} (${elapsedSec}s)…`)
      lastProgressLog = Date.now()
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  const diag = await sandbox.runCommand({
    cmd: "bash",
    args: [
      "-c",
      `ss -tln 2>/dev/null | grep ":${port} " || ps aux | head -20`,
    ],
  })
  const diagOut = (await diag.stdout()).trim()
  throw new Error(
    `Timed out waiting for sandbox port ${port} after ${Math.round(timeoutMs / 60_000)} minutes. Diagnostics: ${diagOut.slice(0, 400)}`
  )
}

async function syncWorkspaceToSandbox(
  sandbox: Sandbox,
  projectPath: string,
  pushLog: (line: string) => void
) {
  const files = await collectWorkspaceFiles(projectPath)
  if (files.length === 0) {
    return
  }

  await ensureSandboxWorkspace(sandbox)

  await sandbox.writeFiles(
    files.map((file) => ({
      path: file.path,
      content: file.content,
    }))
  )

  pushLog(`[sandbox] synced ${files.length} files to preview VM`)
}

export async function provisionSandboxPreview(
  context: PreviewSessionContext
): Promise<PreviewRuntimeHandle> {
  const name = sandboxNameForSession(context.id, context.projectId)
  const pushLog = (line: string) => context.pushLog(`[sandbox] ${line}`)
  const agentRunnerSecret =
    context.agentRunnerSecret?.trim() || randomUUID()

  const runnerEnv: Record<string, string> = {
    CURSOR_API_KEY: context.cursorApiKey,
    AGENT_RUNNER_SECRET: agentRunnerSecret,
    AGENT_RUNNER_PORT: String(SANDBOX_AGENT_RUNNER_PORT),
  }

  let sandbox!: Sandbox
  let created = false

  const startPreviewServices = async (
    s: Sandbox,
    logLabel: string,
    previewWaitMs = SANDBOX_VITE_READY_TIMEOUT_MS
  ) => {
    pushLog(`${logLabel}: starting Next.js (port ${SANDBOX_PREVIEW_PORT})…`)
    await startNextDevDetached(s)
    await waitForSandboxPort(s, SANDBOX_PREVIEW_PORT, pushLog, "/", previewWaitMs)
    pushLog(`${logLabel}: starting agent runner (port ${SANDBOX_AGENT_RUNNER_PORT})…`)
    await startAgentRunnerDetached(s, runnerEnv)
    await waitForSandboxPort(
      s,
      SANDBOX_AGENT_RUNNER_PORT,
      pushLog,
      "/health",
      SANDBOX_SERVICE_READY_TIMEOUT_MS
    )
  }

  const ensureProvisionTimeout = async (s: Sandbox) => {
    await s.extendTimeout(SANDBOX_VM_SESSION_BOOTSTRAP_MS)
  }

  const credentials = sandboxCredentialsFromEnv()

  sandbox = await Sandbox.getOrCreate({
    name,
    ports: [SANDBOX_PREVIEW_PORT, SANDBOX_AGENT_RUNNER_PORT],
    persistent: sandboxPersistentEnabled(),
    timeout: SANDBOX_VM_SESSION_TIMEOUT_MS,
    keepLastSnapshots: SANDBOX_KEEP_LAST_SNAPSHOTS,
    resume: true,
    resources: { vcpus: 2 },
    ...credentials,
    tags: {
      app: "app-builder",
      session: context.id,
    },
    onCreate: async (s) => {
      created = true
      pushLog(`created sandbox ${name}`)
      await s.extendTimeout(SANDBOX_VM_SESSION_BOOTSTRAP_MS)
      await ensureSandboxWorkspace(s)
      await writeTemplateToSandbox(s)
      await writeAgentRunnerToSandbox(s)
      pushLog("running npm install in sandbox (first run can take several minutes)…")
      await runNpmInstall(s, pushLog)
      await startPreviewServices(s, "onCreate")
    },
    onResume: async (s) => {
      pushLog(`resumed sandbox ${name}`)
      await s.extendTimeout(SANDBOX_VM_SESSION_BOOTSTRAP_MS)
      await ensureSandboxWorkspace(s)
      await writeAgentRunnerToSandbox(s)
      const hasPackage = await s.readFileToBuffer({ path: "package.json" })
      if (!hasPackage) {
        await writeTemplateToSandbox(s)
        await runNpmInstall(s, pushLog)
      }
      await startPreviewServices(s, "onResume", SANDBOX_VITE_READY_TIMEOUT_MS)
    },
  })

  await ensureProvisionTimeout(sandbox)

  try {
    await sandbox.update({
      keepLastSnapshots: SANDBOX_KEEP_LAST_SNAPSHOTS,
      ports: [SANDBOX_PREVIEW_PORT, SANDBOX_AGENT_RUNNER_PORT],
    })
  } catch (error) {
    pushLog(
      `sandbox update skipped: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  if (!created) {
    pushLog(`reusing sandbox ${name}`)
    const previewUp = await sandbox.runCommand({
      cmd: "bash",
      args: [
        "-c",
        `curl -sS --connect-timeout 2 -m 5 http://127.0.0.1:${SANDBOX_PREVIEW_PORT}/ -o /dev/null >/dev/null 2>&1 && echo up || true`,
      ],
    })
    const runnerUp = await sandbox.runCommand({
      cmd: "bash",
      args: [
        "-c",
        `curl -sS --connect-timeout 2 -m 5 http://127.0.0.1:${SANDBOX_AGENT_RUNNER_PORT}/health -o /dev/null >/dev/null 2>&1 && echo up || true`,
      ],
    })
    const previewRunning = (await previewUp.stdout()).includes("up")
    const runnerRunning = (await runnerUp.stdout()).includes("up")
    if (!previewRunning || !runnerRunning) {
      await ensureProvisionTimeout(sandbox)
      await writeAgentRunnerToSandbox(sandbox)
      await startPreviewServices(
        sandbox,
        previewRunning ? "runner restart" : "service restart",
        SANDBOX_VITE_READY_TIMEOUT_MS
      )
    }
  }

  const previewUrl = sandbox.domain(SANDBOX_PREVIEW_PORT)
  const agentRunnerUrl = sandbox.domain(SANDBOX_AGENT_RUNNER_PORT)
  pushLog(`preview available at ${previewUrl}`)
  pushLog(`agent runner at ${agentRunnerUrl}`)

  return {
    kind: "sandbox",
    previewUrl,
    port: 0,
    agentRunnerUrl,
    agentRunnerSecret,
    syncFromWorkspace: async (projectPath) =>
      syncWorkspaceToSandbox(sandbox, projectPath, pushLog),
    dispose: async () => {
      /* Let the VM session stop on timeout for automatic snapshots. */
    },
  }
}