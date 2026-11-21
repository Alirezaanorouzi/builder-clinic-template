import type { SDKMessage } from "@cursor/sdk"

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

export function mapSdkMessageToStreamEvents(
  event: SDKMessage
): AgentStreamEvent[] {
  const events: AgentStreamEvent[] = []
  switch (event.type) {
    case "assistant":
      for (const block of event.message.content) {
        if (block.type === "text") {
          events.push({ type: "assistant_delta", text: block.text })
        } else {
          events.push({
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
      events.push({ type: "thinking", id: thinkingId, text: event.text })
      break
    }
    case "tool_call":
      events.push({
        type: "tool_call",
        callId: event.call_id,
        name: event.name,
        status: event.status,
        args: event.args,
        truncatedArgs: event.truncated?.args,
      })
      break
    case "status":
      events.push({
        type: "status",
        status: event.status,
        message: event.message,
      })
      break
    case "task":
      events.push({ type: "task", status: event.status, text: event.text })
      break
    default:
      break
  }
  return events
}

export function emitSdkMessage(
  event: SDKMessage,
  emit: (event: AgentStreamEvent) => void
) {
  for (const streamEvent of mapSdkMessageToStreamEvents(event)) {
    emit(streamEvent)
  }
}