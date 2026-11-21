import type { AgentStreamEvent } from "./agent-stream-events"
import type { ModelSelection } from "@cursor/sdk"

export async function streamAgentFromSandboxRunner(options: {
  agentRunnerUrl: string
  agentRunnerSecret: string
  message: string
  previewUrl: string
  workspace: string
  sessionId: string
  projectId?: string
  model?: ModelSelection
  emit: (event: AgentStreamEvent) => void
}) {
  const response = await fetch(`${options.agentRunnerUrl}/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.agentRunnerSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: options.message,
      previewUrl: options.previewUrl,
      workspace: options.workspace,
      sessionId: options.sessionId,
      projectId: options.projectId,
      model: options.model,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(
      `Sandbox agent runner failed (${response.status}): ${text || response.statusText}`
    )
  }

  if (!response.body) {
    throw new Error("Sandbox agent runner returned an empty body.")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) {
        continue
      }
      const event = JSON.parse(trimmed) as AgentStreamEvent
      options.emit(event)
    }
  }

  const trailing = buffer.trim()
  if (trailing) {
    const event = JSON.parse(trailing) as AgentStreamEvent
    options.emit(event)
  }
}