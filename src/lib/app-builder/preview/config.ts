export type PreviewRuntimeKind = "local" | "sandbox"

export const SANDBOX_PREVIEW_PORT = 5173

/** Hobby plan session cap is 45 minutes — stay under that for Vite readiness. */
export const SANDBOX_SESSION_TIMEOUT_MS = 45 * 60 * 1000

/** First `npm install` + Vite boot in a new sandbox can take 10–40+ minutes. */
export const SANDBOX_VITE_READY_TIMEOUT_MS = Math.min(
  parsePositiveInt(process.env.SANDBOX_VITE_READY_TIMEOUT_MS, 40 * 60 * 1000),
  SANDBOX_SESSION_TIMEOUT_MS - 60_000
)

function parsePositiveInt(raw: string | undefined, fallback: number) {
  if (!raw?.trim()) {
    return fallback
  }

  const value = Number.parseInt(raw, 10)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

/** How generated apps are served: machine-local Vite or Vercel Sandbox HTTPS URL. */
export function getPreviewRuntimeKind(): PreviewRuntimeKind {
  const value = process.env.APP_BUILDER_PREVIEW_RUNTIME?.trim().toLowerCase()
  return value === "sandbox" ? "sandbox" : "local"
}

/** Persistent sandboxes keep snapshots (fast resume, counts against Hobby storage caps). */
export function sandboxPersistentEnabled(): boolean {
  const raw = process.env.APP_BUILDER_SANDBOX_PERSISTENT?.trim().toLowerCase()
  if (raw === "false" || raw === "0" || raw === "off") {
    return false
  }
  return true
}

export function sandboxNameForSession(
  sessionId: string,
  projectId?: string
) {
  if (projectId) {
    return `app-builder-project-${projectId}`
  }
  return `app-builder-${sessionId}`
}