import { SessionAccessDeniedError, assertSessionOwnedByCurrentUser } from "@/lib/auth/assert-session-access"
import {
  AuthNotConfiguredError,
  AuthRequiredError,
} from "@/lib/auth/get-app-user"
import { allowUserApiKeys, requireMultiUserMode } from "@/lib/auth/config"
import { resolveServerCursorApiKey } from "@/lib/auth/resolve-api-key"
import {
  UNRECOGNIZED_CURSOR_API_KEY_MESSAGE,
  isRecognizedCursorApiKey,
  normalizeCursorApiKey,
} from "@/lib/app-builder/api-key"
import {
  createSession,
  InvalidCursorApiKeyError,
  restoreSession,
  savePersistedCursorApiKey,
  UnknownAppBuilderSessionError,
  validateCursorApiKey,
} from "@/lib/app-builder/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
/** First sandbox provision can take up to ~45 minutes when deployed on Vercel. */
export const maxDuration = 800

type SessionRequest = {
  apiKey?: string
  persistApiKey?: boolean
  sessionId?: string
  projectId?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as SessionRequest
    const submittedApiKey = body.apiKey
      ? normalizeCursorApiKey(body.apiKey)
      : undefined
    const sessionId = body.sessionId?.trim()
    const projectId = body.projectId?.trim()

    let apiKey: string
    try {
      apiKey = await resolveServerCursorApiKey(submittedApiKey)
    } catch {
      return Response.json(
        {
          code: "missing_api_key",
          error: "A Cursor API key is required to start a session.",
        },
        { status: 400 }
      )
    }

    if (!isRecognizedCursorApiKey(apiKey)) {
      return Response.json(
        {
          code: "invalid_api_key",
          error: UNRECOGNIZED_CURSOR_API_KEY_MESSAGE,
        },
        { status: 400 }
      )
    }

    await validateCursorApiKey(apiKey)

    const shouldPersist =
      Boolean(submittedApiKey) &&
      body.persistApiKey &&
      allowUserApiKeys() &&
      !requireMultiUserMode()

    if (shouldPersist && submittedApiKey) {
      await savePersistedCursorApiKey(submittedApiKey)
    }

    if (sessionId) {
      await assertSessionOwnedByCurrentUser(sessionId)
      const session = await restoreSession(sessionId, apiKey)
      return Response.json(session)
    }

    const session = await createSession(
      apiKey,
      projectId ? { projectId } : undefined
    )
    return Response.json(session)
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return Response.json({ code: error.code, error: "Sign in required." }, {
        status: 401,
      })
    }
    if (error instanceof AuthNotConfiguredError) {
      return Response.json(
        { code: error.code, error: "Multi-user mode is not configured." },
        { status: 503 }
      )
    }
    if (error instanceof SessionAccessDeniedError) {
      return Response.json(
        { code: error.code, error: error.message },
        { status: 403 }
      )
    }
    if (error instanceof InvalidCursorApiKeyError) {
      return Response.json(
        {
          code: error.code,
          error: error.message,
        },
        { status: 400 }
      )
    }

    if (error instanceof UnknownAppBuilderSessionError) {
      return Response.json(
        {
          code: error.code,
          error: error.message,
        },
        { status: 404 }
      )
    }

    const message =
      error instanceof Error ? error.message : "Failed to create session."

    return Response.json({ error: message }, { status: 500 })
  }
}
