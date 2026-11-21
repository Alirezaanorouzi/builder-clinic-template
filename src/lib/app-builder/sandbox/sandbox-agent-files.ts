import { readFile } from "node:fs/promises"
import path from "node:path"

import { APP_BUILDER_INSTRUCTIONS } from "../agent-instructions"

export async function loadSandboxAgentRunnerFiles(): Promise<
  Array<{ path: string; content: Buffer }>
> {
  const runnerDir = path.join(
    process.cwd(),
    "src/lib/app-builder/sandbox"
  )
  const runner = await readFile(path.join(runnerDir, "agent-runner.mjs"))
  const instructions = Buffer.from(
    JSON.stringify(APP_BUILDER_INSTRUCTIONS),
    "utf8"
  )
  return [
    { path: "agent-runner.mjs", content: runner },
    { path: ".agent-instructions.json", content: instructions },
  ]
}