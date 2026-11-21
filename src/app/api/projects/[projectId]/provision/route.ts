import { after } from "next/server"
import { randomUUID } from "node:crypto"

import { requireProjectForUser } from "@/lib/auth/require-project-access"
import { apiErrors } from "@/lib/i18n/api-errors"
import { authErrorResponse } from "@/lib/i18n/auth-error-response"
import { resolveServerCursorApiKey } from "@/lib/auth/resolve-api-key"
import {
  InvalidCursorApiKeyError,
  UnknownAppBuilderSessionError,
  beginBuilderSession,
  finalizeProjectProvisionIfReady,
  isBuilderSessionSandboxReady,
  restoreSession,
  scheduleProjectProvisionCompletion,
  toPublicBuilderSession,
  validateCursorApiKey,
} from "@/lib/app-builder/server"
import { getPreviewRuntimeKind } from "@/lib/app-builder/preview/config"
import { updateProject } from "@/lib/db/projects"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
/** Hobby plan max is 300s; sandbox boot completes in after() + client polling. */
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
      ...(project.provisionStatus === "ready" && project.builderSessionId
        ? {
            session: {
              id: project.builderSessionId,
              previewUrl: project.previewUrl ?? "",
              projectPath: "",
              previewRuntime: project.previewRuntime ?? getPreviewRuntimeKind(),
              models: [],
              user: null,
            },
          }
        : {}),
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

    const apiKey = await resolveServerCursorApiKey(body.apiKey)
    await validateCursorApiKey(apiKey)

    const runnerSecret = project.agentRunnerSecret ?? undefined
    const provisionTarget = { projectId, userId: user.id }

    if (project.provisionStatus === "ready" && project.builderSessionId) {
      try {
        const session = await restoreSession(project.builderSessionId, apiKey, {
          agentRunnerSecret: runnerSecret,
        })
        return Response.json({
          provisionStatus: "ready" as const,
          session,
        })
      } catch (error) {
        if (!(error instanceof UnknownAppBuilderSessionError)) {
          throw error
        }
      }
    }

    const sessionId = project.builderSessionId ?? randomUUID()
    if (!project.builderSessionId) {
      await updateProject(projectId, user.id, {
        builderSessionId: sessionId,
        provisionStatus: "pending",
        provisionError: null,
      })
    } else if (project.provisionStatus !== "pending") {
      await updateProject(projectId, user.id, {
        provisionStatus: "pending",
        provisionError: null,
      })
    }

    const session = await beginBuilderSession(apiKey, {
      projectId,
      sessionId,
      agentRunnerSecret: runnerSecret,
    })

    const completed = await finalizeProjectProvisionIfReady(
      provisionTarget,
      session
    )
    if (completed) {
      return Response.json({
        provisionStatus: "ready" as const,
        session: completed,
      })
    }

    after(() => scheduleProjectProvisionCompletion(provisionTarget, session))

    return Response.json(
      {
        provisionStatus: "pending" as const,
        session: toPublicBuilderSession(session),
      },
      { status: 202 }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : apiErrors.provisioningFailed

    if (error instanceof InvalidCursorApiKeyError) {
      return Response.json(
        { code: error.code, error: error.message, provisionStatus: "error" },
        { status: 400 }
      )
    }

    try {
      const { projectId } = await params
      const access = await requireProjectForUser(projectId)
      if (access) {
        console.error("[provision]", projectId, message, error)
        await updateProject(projectId, access.user.id, {
          provisionStatus: "error",
          provisionError: message,
        })
        return Response.json(
          { error: message, provisionStatus: "error" },
          { status: 500 }
        )
      }
    } catch {
      /* fall through */
    }

    return authErrorResponse(error)
  }
}