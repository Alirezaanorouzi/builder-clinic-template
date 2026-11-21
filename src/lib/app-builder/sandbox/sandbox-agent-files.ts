import { APP_BUILDER_INSTRUCTIONS } from "../agent-instructions"
import { SANDBOX_AGENT_RUNNER_MJS } from "./agent-runner.embedded"

export async function loadSandboxAgentRunnerFiles(): Promise<
  Array<{ path: string; content: Buffer }>
> {
  const instructions = Buffer.from(
    JSON.stringify(APP_BUILDER_INSTRUCTIONS),
    "utf8"
  )
  return [
    { path: "agent-runner.mjs", content: SANDBOX_AGENT_RUNNER_MJS },
    { path: ".agent-instructions.json", content: instructions },
  ]
}