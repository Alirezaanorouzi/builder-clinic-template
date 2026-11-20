import {
  AuthNotConfiguredError,
  AuthRequiredError,
} from "@/lib/auth/get-app-user"
import { requireProjectForUser } from "@/lib/auth/require-project-access"
import {
  appendMessage,
  listMessagesForProject,
  replaceMessagesForProject,
} from "@/lib/db/projects"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: Promise<{ projectId: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { projectId } = await params
    const access = await requireProjectForUser(projectId)
    if (!access) {
      return Response.json({ error: "Project not found." }, { status: 404 })
    }
    const messages = await listMessagesForProject(projectId)
    return Response.json({ messages })
  } catch (error) {
    return authErrorResponse(error)
  }
}

type MessageInput = {
  role: "user" | "assistant" | "system"
  content?: string
  payload?: unknown
}

type PostBody = {
  mode?: "append" | "replace"
  message?: MessageInput
  messages?: MessageInput[]
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { projectId } = await params
    const access = await requireProjectForUser(projectId)
    if (!access) {
      return Response.json({ error: "Project not found." }, { status: 404 })
    }

    const body = (await request.json()) as PostBody

    if (body.mode === "replace" && Array.isArray(body.messages)) {
      const saved = await replaceMessagesForProject(
        projectId,
        body.messages.map((row) => ({
          role: row.role,
          content: row.content ?? "",
          payload: row.payload ?? null,
        }))
      )
      return Response.json({ messages: saved })
    }

    if (!body.message?.role) {
      return Response.json(
        { error: "message.role is required for append mode." },
        { status: 400 }
      )
    }

    const saved = await appendMessage(projectId, {
      role: body.message.role,
      content: body.message.content ?? "",
      payload: body.message.payload ?? null,
    })

    return Response.json({ message: saved }, { status: 201 })
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