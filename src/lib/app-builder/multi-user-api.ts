import { fa, friendlySessionError } from "@/lib/i18n/fa"

export type RemoteProject = {
  id: string
  title: string
  builderSessionId: string | null
  previewUrl: string | null
  previewRuntime: "sandbox" | null
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

const PROVISION_POLL_MS = 4_000
const PROVISION_REKICK_MS = 90_000
const PROVISION_MAX_MS = 45 * 60 * 1000
const PROVISION_KICK_TIMEOUT_MS = 90_000

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
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
    throw new Error(data.error ?? fa.errors.createProject)
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
    throw new Error(data.error ?? fa.errors.updateProject)
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
    throw new Error(data.error ?? fa.errors.saveMessages)
  }
}

type ProvisionKickResult = {
  error?: string
  session?: unknown
  provisionStatus?: "pending" | "ready" | "error"
}

async function kickProvision(
  projectId: string,
  apiKey?: string
): Promise<ProvisionKickResult> {
  const response = await fetch(`/api/projects/${projectId}/provision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
    signal: AbortSignal.timeout(PROVISION_KICK_TIMEOUT_MS),
  })

  const data = (await response.json().catch(() => ({}))) as ProvisionKickResult

  if (response.status === 504 || response.status === 524) {
    return { provisionStatus: "pending", ...data }
  }

  if (!response.ok && response.status !== 202) {
    throw new Error(data.error ?? fa.errors.provisionProject)
  }

  return data
}

export async function fetchProvisionStatus(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/provision`, {
    cache: "no-store",
  })
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error ?? fa.errors.requestFailed)
  }
  return (await response.json()) as ProvisionKickResult & {
    provisionError?: string | null
    previewUrl?: string | null
    builderSessionId?: string | null
  }
}

export async function provisionRemoteProject(projectId: string, apiKey?: string) {
  const startedAt = Date.now()
  let lastKickAt = 0

  let kick = await kickProvision(projectId, apiKey).catch((error) => {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return { provisionStatus: "pending" as const }
    }
    throw error
  })
  lastKickAt = Date.now()

  if (kick.provisionStatus === "ready" && kick.session) {
    return kick
  }
  if (kick.provisionStatus === "error") {
    throw new Error(
      friendlySessionError(kick.error ?? fa.errors.provisioningFailed)
    )
  }

  while (Date.now() - startedAt < PROVISION_MAX_MS) {
    await sleep(PROVISION_POLL_MS)

    if (Date.now() - lastKickAt >= PROVISION_REKICK_MS) {
      kick = await kickProvision(projectId, apiKey).catch(() => kick)
      lastKickAt = Date.now()
      if (kick.provisionStatus === "ready" && kick.session) {
        return kick
      }
      if (kick.provisionStatus === "error") {
        throw new Error(
          friendlySessionError(kick.error ?? fa.errors.provisioningFailed)
        )
      }
    }

    const status = await fetchProvisionStatus(projectId)
    if (status.provisionStatus === "ready") {
      const ready = await kickProvision(projectId, apiKey)
      if (ready.provisionStatus === "ready" && ready.session) {
        return ready
      }
      if (ready.session) {
        return { ...ready, provisionStatus: "ready" as const }
      }
      throw new Error(fa.errors.provisionNoSession)
    }
    if (status.provisionStatus === "error") {
      throw new Error(
        friendlySessionError(
          status.provisionError ?? status.error ?? fa.errors.provisioningFailed
        )
      )
    }
  }

  throw new Error(friendlySessionError(fa.sessionErrors.sandboxTimeout))
}