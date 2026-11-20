import { getProjectByBuilderSessionId } from "@/lib/db/projects"
import { requireMultiUserMode } from "./config"
import { getAppUser } from "./get-app-user"

export async function assertSessionOwnedByCurrentUser(sessionId: string) {
  if (!requireMultiUserMode()) {
    return
  }

  if (!sessionId.trim()) {
    return
  }

  const user = await getAppUser()
  const project = await getProjectByBuilderSessionId(sessionId)
  if (!project || project.userId !== user.id) {
    throw new SessionAccessDeniedError()
  }
}

export class SessionAccessDeniedError extends Error {
  readonly code = "session_forbidden"

  constructor(message = "This builder session does not belong to your account.") {
    super(message)
    this.name = "SessionAccessDeniedError"
  }
}