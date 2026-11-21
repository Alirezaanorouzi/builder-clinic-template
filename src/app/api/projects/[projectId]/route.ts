import { requireProjectForUser } from "@/lib/auth/require-project-access"
import { deleteProject, updateProject } from "@/lib/db/projects"
import { apiErrors } from "@/lib/i18n/api-errors"
import { authErrorResponse } from "@/lib/i18n/auth-error-response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: Promise<{ projectId: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { projectId } = await params
    const access = await requireProjectForUser(projectId)
    if (!access) {
      return Response.json({ error: apiErrors.projectNotFound }, { status: 404 })
    }
    return Response.json({ project: access.project })
  } catch (error) {
    return authErrorResponse(error)
  }
}

type PatchBody = {
  title?: string
  modelSelection?: string | null
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { projectId } = await params
    const access = await requireProjectForUser(projectId)
    if (!access) {
      return Response.json({ error: apiErrors.projectNotFound }, { status: 404 })
    }
    const body = (await request.json().catch(() => ({}))) as PatchBody
    const project = await updateProject(projectId, access.user.id, {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.modelSelection !== undefined
        ? { modelSelection: body.modelSelection }
        : {}),
    })
    return respondWithProject(project)
  } catch (error) {
    return authErrorResponse(error)
  }
}

function respondWithProject(
  project: Awaited<ReturnType<typeof updateProject>>
) {
  if (!project) {
    return Response.json({ error: apiErrors.projectNotFound }, { status: 404 })
  }
  return Response.json({ project })
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { projectId } = await params
    const access = await requireProjectForUser(projectId)
    if (!access) {
      return Response.json({ error: apiErrors.projectNotFound }, { status: 404 })
    }
    const ok = await deleteProject(projectId, access.user.id)
    if (!ok) {
      return Response.json({ error: apiErrors.projectNotFound }, { status: 404 })
    }
    return Response.json({ ok: true })
  } catch (error) {
    return authErrorResponse(error)
  }
}
