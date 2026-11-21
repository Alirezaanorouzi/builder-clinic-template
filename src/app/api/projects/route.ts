import { getAppUser } from "@/lib/auth/get-app-user"
import { createProject, listProjectsForUser } from "@/lib/db/projects"
import { authErrorResponse } from "@/lib/i18n/auth-error-response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const user = await getAppUser()
    const rows = await listProjectsForUser(user.id)
    return Response.json({ projects: rows })
  } catch (error) {
    return authErrorResponse(error)
  }
}

type CreateProjectBody = {
  title?: string
}

export async function POST(request: Request) {
  try {
    const user = await getAppUser()
    const body = (await request.json().catch(() => ({}))) as CreateProjectBody
    const project = await createProject(user.id, body.title)
    return Response.json({ project }, { status: 201 })
  } catch (error) {
    return authErrorResponse(error)
  }
}
