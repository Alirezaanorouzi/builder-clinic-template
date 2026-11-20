import { Sandbox } from "@vercel/sandbox"

import { generatedAppFiles } from "../template"
import {
  SANDBOX_PREVIEW_PORT,
  SANDBOX_SESSION_TIMEOUT_MS,
  SANDBOX_VITE_READY_TIMEOUT_MS,
  sandboxNameForSession,
} from "./config"
import { collectWorkspaceFiles } from "./workspace-files"
import { sandboxCredentialsFromEnv } from "./sandbox-credentials"
import type { PreviewRuntimeHandle, PreviewSessionContext } from "./types"

const SANDBOX_WORKDIR = "/vercel/sandbox"

async function ensureSandboxWorkspace(sandbox: Sandbox) {
  const ready = await sandbox.runCommand({
    cmd: "bash",
    args: ["-c", `mkdir -p ${SANDBOX_WORKDIR} && test -d ${SANDBOX_WORKDIR} && echo ok`],
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

async function waitForSandboxPort(
  sandbox: Sandbox,
  port: number,
  pushLog: (line: string) => void,
  timeoutMs = SANDBOX_VITE_READY_TIMEOUT_MS
) {
  const startedAt = Date.now()
  let lastProgressLog = startedAt

  while (Date.now() - startedAt < timeoutMs) {
    const ping = await sandbox.runCommand({
      cmd: "bash",
      args: [
        "-c",
        `curl -sf http://127.0.0.1:${port} >/dev/null && echo up || true`,
      ],
    })
    if ((await ping.stdout()).includes("up")) {
      return
    }

    if (Date.now() - lastProgressLog > 15_000) {
      const elapsedSec = Math.round((Date.now() - startedAt) / 1000)
      pushLog(`waiting for Next.js on port ${port} (${elapsedSec}s)…`)
      lastProgressLog = Date.now()
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error(
    `Timed out waiting for Next.js on sandbox port ${port} after ${Math.round(timeoutMs / 60_000)} minutes.`
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

  let sandbox!: Sandbox
  let created = false

  const startPreviewServer = async (s: Sandbox) => {
    await startNextDevDetached(s)
    await waitForSandboxPort(s, SANDBOX_PREVIEW_PORT, pushLog)
  }

  const credentials = sandboxCredentialsFromEnv()

  sandbox = await Sandbox.getOrCreate({
    name,
    ports: [SANDBOX_PREVIEW_PORT],
    persistent: true,
    timeout: SANDBOX_SESSION_TIMEOUT_MS,
    resources: { vcpus: 2 },
    ...credentials,
    tags: {
      app: "app-builder",
      session: context.id,
    },
    onCreate: async (s) => {
      created = true
      pushLog(`created sandbox ${name}`)
      await ensureSandboxWorkspace(s)
      await writeTemplateToSandbox(s)
      pushLog("running npm install in sandbox (first run can take several minutes)…")
      await runNpmInstall(s, pushLog)
      await startPreviewServer(s)
    },
    onResume: async (s) => {
      pushLog(`resumed sandbox ${name}`)
      await ensureSandboxWorkspace(s)
      const hasPackage = await s.readFileToBuffer({ path: "package.json" })
      if (!hasPackage) {
        await writeTemplateToSandbox(s)
        await runNpmInstall(s, pushLog)
      }
      await startPreviewServer(s)
    },
  })

  if (!created) {
    pushLog(`reusing sandbox ${name}`)
    const ping = await sandbox.runCommand({
      cmd: "bash",
      args: [
        "-c",
        `curl -sf http://127.0.0.1:${SANDBOX_PREVIEW_PORT} >/dev/null && echo up || true`,
      ],
    })
    if (!(await ping.stdout()).includes("up")) {
      await startPreviewServer(sandbox)
    }
  }

  const previewUrl = sandbox.domain(SANDBOX_PREVIEW_PORT)
  pushLog(`preview available at ${previewUrl}`)

  return {
    kind: "sandbox",
    previewUrl,
    port: 0,
    syncFromWorkspace: async (projectPath) =>
      syncWorkspaceToSandbox(sandbox, projectPath, pushLog),
    dispose: async () => {
      /* Keep persistent sandboxes running for mobile / remote preview URLs. */
    },
  }
}