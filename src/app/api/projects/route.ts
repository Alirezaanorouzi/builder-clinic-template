import {
  AuthNotConfiguredError,
  AuthRequiredError,
  getAppUser,
} from "@/lib/auth/get-app-user"
import { createProject, listProjectsForUser } from "@/lib/db/projects"

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

function authErrorResponse(error: unknown) {
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
  const message =
    error instanceof Error ? error.message : "Request failed."
  return Response.json({ error: message }, { status: 500 })
}