import { and, asc, desc, eq } from "drizzle-orm"

import { createDb } from "./index"
import { messages, projects, type NewMessage, type NewProject } from "./schema"

export async function listProjectsForUser(userId: string) {
  const db = createDb()
  return db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.updatedAt))
}

export async function getProjectForUser(userId: string, projectId: string) {
  const db = createDb()
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1)
  return project ?? null
}

export async function createProject(userId: string, title?: string) {
  const db = createDb()
  const values: NewProject = {
    userId,
    title: title?.trim() || "Untitled project",
    provisionStatus: "pending",
  }
  const [project] = await db.insert(projects).values(values).returning()
  return project
}

export async function updateProject(
  projectId: string,
  userId: string,
  patch: Partial<{
    title: string
    builderSessionId: string | null
    previewUrl: string | null
    previewRuntime: "local" | "sandbox" | null
    provisionStatus: "pending" | "ready" | "error"
    provisionError: string | null
    modelSelection: string | null
    agentRunnerSecret: string | null
  }>
) {
  const db = createDb()
  const [project] = await db
    .update(projects)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .returning()
  return project ?? null
}

export async function deleteProject(projectId: string, userId: string) {
  const db = createDb()
  const [deleted] = await db
    .delete(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .returning({ id: projects.id })
  return Boolean(deleted)
}

export async function getProjectByBuilderSessionId(builderSessionId: string) {
  const db = createDb()
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.builderSessionId, builderSessionId))
    .limit(1)
  return project ?? null
}

export async function listMessagesForProject(projectId: string) {
  const db = createDb()
  return db
    .select()
    .from(messages)
    .where(eq(messages.projectId, projectId))
    .orderBy(asc(messages.createdAt))
}

export async function replaceMessagesForProject(
  projectId: string,
  rows: Array<Pick<NewMessage, "role" | "content" | "payload">>
) {
  const db = createDb()
  await db.delete(messages).where(eq(messages.projectId, projectId))
  if (rows.length === 0) {
    return []
  }
  return db
    .insert(messages)
    .values(
      rows.map((row) => ({
        projectId,
        role: row.role,
        content: row.content,
        payload: row.payload,
      }))
    )
    .returning()
}

export async function appendMessage(
  projectId: string,
  row: Pick<NewMessage, "role" | "content" | "payload">
) {
  const db = createDb()
  const [message] = await db
    .insert(messages)
    .values({
      projectId,
      role: row.role,
      content: row.content,
      payload: row.payload,
    })
    .returning()
  return message
}