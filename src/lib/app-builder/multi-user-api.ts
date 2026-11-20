export type RemoteProject = {
  id: string
  title: string
  builderSessionId: string | null
  previewUrl: string | null
  previewRuntime: "local" | "sandbox" | null
  provisionStatus: "pending" | "ready" | "error"
  provisionError: string | null
  modelSelection: string | null
  createdAt: string
  updatedAt: string
}

export type RemoteMessage = {
  id: string
  projectId: string
  role: "user" | "assistant" | "system"
  content: string
  payload: unknown
  createdAt: string
}

export type AppBuilderConfig = {
  multiUser: boolean
  allowUserApiKeys: boolean
  previewRuntime: "local" | "sandbox"
}

export async function fetchAppBuilderConfig(): Promise<AppBuilderConfig> {
  const response = await fetch("/api/config")
  if (!response.ok) {
    return {
      multiUser: false,
      allowUserApiKeys: true,
      previewRuntime: "local",
    }
  }
  return (await response.json()) as AppBuilderConfig
}

export async function fetchProjects(): Promise<RemoteProject[]> {
  const response = await fetch("/api/projects")
  if (!response.ok) {
    return []
  }
  const data = (await response.json()) as { projects?: RemoteProject[] }
  return data.projects ?? []
}

export async function createRemoteProject(title?: string): Promise<RemoteProject> {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  })
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error ?? "Failed to create project.")
  }
  const data = (await response.json()) as { project: RemoteProject }
  return data.project
}

export async function patchRemoteProject(
  projectId: string,
  patch: { title?: string; modelSelection?: string | null }
) {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  })
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error ?? "Failed to update project.")
  }
}

export async function fetchProjectMessages(
  projectId: string
): Promise<RemoteMessage[]> {
  const response = await fetch(`/api/projects/${projectId}/messages`)
  if (!response.ok) {
    return []
  }
  const data = (await response.json()) as { messages?: RemoteMessage[] }
  return data.messages ?? []
}

export async function replaceRemoteMessages(
  projectId: string,
  rows: Array<{ role: "user" | "assistant" | "system"; content: string; payload?: unknown }>
) {
  const response = await fetch(`/api/projects/${projectId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "replace", messages: rows }),
  })
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error ?? "Failed to save messages.")
  }
}

export async function provisionRemoteProject(projectId: string, apiKey?: string) {
  const response = await fetch(`/api/projects/${projectId}/provision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  })
  const data = (await response.json()) as {
    error?: string
    session?: unknown
    provisionStatus?: string
  }
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to provision project.")
  }
  return data
}