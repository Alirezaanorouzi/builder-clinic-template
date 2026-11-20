import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process"
import net from "node:net"

import type { PreviewRuntimeHandle, PreviewSessionContext } from "./types"

type PreviewPackageManager = {
  command: string
  installArgs: string[]
  devArgs: (port: number) => string[]
}

function getPreviewPackageManager(): PreviewPackageManager {
  return {
    command: "npm",
    installArgs: ["install"],
    devArgs: (port) => [
      "run",
      "dev",
      "--",
      "-p",
      String(port),
      "-H",
      "127.0.0.1",
    ],
  }
}

function spawnPreviewProcess(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  pushLog: (line: string) => void
) {
  const child = spawn(command, args, {
    cwd,
    env,
    shell: process.platform === "win32",
    windowsHide: true,
  }) as ChildProcessWithoutNullStreams

  const append = (chunk: Buffer) => {
    pushLog(chunk.toString())
  }

  child.stdout.on("data", append)
  child.stderr.on("data", append)

  return child
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
  pushLog: (line: string) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawnPreviewProcess(command, args, cwd, { ...process.env, CI: "1" }, pushLog)

    child.once("error", reject)
    child.once("exit", (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(
        new Error(
          `${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}`
        )
      )
    })
  })
}

function waitForPort(port: number, timeoutMs = 120_000): Promise<void> {
  const startedAt = Date.now()

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect(port, "127.0.0.1")
      socket.once("connect", () => {
        socket.end()
        resolve()
      })
      socket.once("error", () => {
        socket.destroy()
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for preview server on ${port}.`))
          return
        }
        setTimeout(attempt, 250)
      })
    }

    attempt()
  })
}

function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      server.close(() => {
        if (!address || typeof address === "string") {
          reject(new Error("Could not allocate a preview port."))
          return
        }

        resolve(address.port)
      })
    })
  })
}

export async function provisionLocalPreview(
  context: PreviewSessionContext
): Promise<PreviewRuntimeHandle> {
  const port = await getAvailablePort()
  const pm = getPreviewPackageManager()
  const pushLog = (line: string) => context.pushLog(`[local] ${line}`)

  context.pushLog(`[local] npm install in ${context.projectPath}`)
  await runCommand(pm.command, pm.installArgs, context.projectPath, pushLog)

  let devProcess: ChildProcessWithoutNullStreams | undefined
  devProcess = spawnPreviewProcess(
    pm.command,
    pm.devArgs(port),
    context.projectPath,
    { ...process.env, BROWSER: "none" },
    (line) => context.pushLog(`[next] ${line}`)
  )

  devProcess.once("exit", (code) => {
    context.pushLog(`[next] exited with code ${code ?? "unknown"}`)
    devProcess = undefined
  })

  await waitForPort(port)

  return {
    kind: "local",
    previewUrl: `http://127.0.0.1:${port}`,
    port,
    syncFromWorkspace: async () => {
      /* Next.js hot-reloads from disk; nothing to push. */
    },
    dispose: async () => {
      if (devProcess && !devProcess.killed) {
        devProcess.kill()
      }
    },
  }
}