import { requireProjectForUser } from "@/lib/auth/require-project-access"
import { apiErrors } from "@/lib/i18n/api-errors"
import { authErrorResponse } from "@/lib/i18n/auth-error-response"
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
      return Response.json({ error: apiErrors.projectNotFound }, { status: 404 })
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
      return Response.json({ error: apiErrors.projectNotFound }, { status: 404 })
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
        { error: apiErrors.messagesRoleRequired },
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
