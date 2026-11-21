import { requireProjectForUser } from "@/lib/auth/require-project-access"
import { apiErrors } from "@/lib/i18n/api-errors"
import { authErrorResponse } from "@/lib/i18n/auth-error-response"
import { resolveServerCursorApiKey } from "@/lib/auth/resolve-api-key"
import {
  InvalidCursorApiKeyError,
  createSession,
  restoreSession,
  validateCursorApiKey,
} from "@/lib/app-builder/server"
import { getPreviewRuntimeKind } from "@/lib/app-builder/preview/config"
import { updateProject } from "@/lib/db/projects"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
/** Hobby plan max is 300s; use async provision (Phase 2) for longer sandbox boot. */
export const maxDuration = 300

type Params = { params: Promise<{ projectId: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { projectId } = await params
    const access = await requireProjectForUser(projectId)
    if (!access) {
      return Response.json({ error: apiErrors.projectNotFound }, { status: 404 })
    }

    const { project } = access
    return Response.json({
      provisionStatus: project.provisionStatus,
      provisionError: project.provisionError,
      previewUrl: project.previewUrl,
      previewRuntime: project.previewRuntime,
      builderSessionId: project.builderSessionId,
    })
  } catch (error) {
    return authErrorResponse(error)
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { projectId } = await params
    const access = await requireProjectForUser(projectId)
    if (!access) {
      return Response.json({ error: apiErrors.projectNotFound }, { status: 404 })
    }

    const { user, project } = access
    const body = (await request.json().catch(() => ({}))) as {
      apiKey?: string
    }

    await updateProject(projectId, user.id, {
      provisionStatus: "pending",
      provisionError: null,
    })

    const apiKey = await resolveServerCursorApiKey(body.apiKey)
    await validateCursorApiKey(apiKey)

  let session
  try {
    if (project.builderSessionId) {
      try {
        session = await restoreSession(project.builderSessionId, apiKey)
      } catch {
        session = await createSession(apiKey, { projectId })
      }
    } else {
      session = await createSession(apiKey, { projectId })
    }

    const previewRuntime = getPreviewRuntimeKind()
    await updateProject(projectId, user.id, {
      builderSessionId: session.id,
      previewUrl: session.previewUrl,
      previewRuntime,
      provisionStatus: "ready",
      provisionError: null,
    })

    return Response.json({
      provisionStatus: "ready" as const,
      session,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : apiErrors.provisioningFailed
    console.error("[provision]", projectId, message, error)
    await updateProject(projectId, user.id, {
      provisionStatus: "error",
      provisionError: message,
    })

    if (error instanceof InvalidCursorApiKeyError) {
      return Response.json(
        { code: error.code, error: error.message, provisionStatus: "error" },
        { status: 400 }
      )
    }

    return Response.json(
      { error: message, provisionStatus: "error" },
      { status: 500 }
    )
  }
  } catch (error) {
    return authErrorResponse(error)
  }
}
