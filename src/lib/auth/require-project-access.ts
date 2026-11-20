import { getProjectForUser } from "@/lib/db/projects"

import { getAppUser } from "./get-app-user"

export async function requireProjectForUser(projectId: string) {
  const user = await getAppUser()
  const project = await getProjectForUser(user.id, projectId)
  if (!project) {
    return null
  }
  return { user, project }
}