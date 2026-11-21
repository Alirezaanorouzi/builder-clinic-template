import {
  SessionAccessDeniedError,
  assertSessionOwnedByCurrentUser,
} from "@/lib/auth/assert-session-access"
import { resolveServerCursorApiKey } from "@/lib/auth/resolve-api-key"
import {
  AuthNotConfiguredError,
  AuthRequiredError,
} from "@/lib/auth/get-app-user"
import {
  attachBuilderSessionIfMissing,
  getPublicSession,
  streamAgentResponse,
  type AgentStreamEvent,
} from "@/lib/app-builder/server"
import { apiErrors } from "@/lib/i18n/api-errors"
import { friendlyAgentError } from "@/lib/i18n/fa"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type ChatRequest = {
  sessionId?: string
  message?: string
  model?: string
}

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequest

  if (!body.sessionId || !body.message?.trim()) {
    return Response.json(
      { error: apiErrors.sessionAndMessageRequired },
      { status: 400 }
    )
  }

  try {
    await assertSessionOwnedByCurrentUser(body.sessionId)
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return Response.json({ code: error.code, error: apiErrors.signInRequired }, {
        status: 401,
      })
    }
    if (error instanceof AuthNotConfiguredError) {
      return Response.json(
        { code: error.code, error: apiErrors.multiUserNotConfigured },
        { status: 503 }
      )
    }
    if (error instanceof SessionAccessDeniedError) {
      return Response.json(
        { code: error.code, error: error.message },
        { status: 403 }
      )
    }
    const message =
      error instanceof Error ? error.message : apiErrors.authorizationFailed
    return Response.json({ error: message }, { status: 500 })
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder()
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      try {
        const apiKey = await resolveServerCursorApiKey()
        await attachBuilderSessionIfMissing(body.sessionId!, apiKey)
        const session = await getPublicSession(body.sessionId!, { apiKey })
        send("session", session)

        await streamAgentResponse(
          body.sessionId!,
          body.message!,
          body.model,
          (event: AgentStreamEvent) => send(event.type, event)
        )

        send("done", { ok: true })
      } catch (error) {
        const message = friendlyAgentError(error)
        send("error", { message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  })
}

