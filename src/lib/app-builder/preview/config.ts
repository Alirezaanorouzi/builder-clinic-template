import type { Sandbox } from "@vercel/sandbox"

export type PreviewRuntimeKind = "sandbox"

export const SANDBOX_PREVIEW_PORT = 5173
export const SANDBOX_AGENT_RUNNER_PORT = 3921

/** Default Vercel sandbox VM session length after boot (5 minutes). */
export const SANDBOX_VM_SESSION_TIMEOUT_MS = 5 * 60 * 1000

/** Hobby plan max VM session length — used during first cold npm install. */
export const SANDBOX_VM_SESSION_BOOTSTRAP_MS = 45 * 60 * 1000

/** How much to extend a fresh 5m session to reach the Hobby bootstrap cap (extend is additive). */
export const SANDBOX_VM_SESSION_PROVISION_EXTEND_MS =
  SANDBOX_VM_SESSION_BOOTSTRAP_MS - SANDBOX_VM_SESSION_TIMEOUT_MS

/**
 * `Sandbox.extendTimeout` adds to the current session length — it does not set an absolute cap.
 * Call this to reach `targetMs` without exceeding the Hobby maximum (e.g. 5m + 45m extend → error).
 */
export async function ensureSandboxSessionTimeoutAtLeast(
  sandbox: Sandbox,
  targetMs = SANDBOX_VM_SESSION_BOOTSTRAP_MS
) {
  const currentMs = sandbox.currentSession().timeout
  const increment = targetMs - currentMs
  if (increment <= 0) {
    return
  }
  await sandbox.extendTimeout(increment)
}

/** @deprecated Use SANDBOX_VM_SESSION_* constants. */
export const SANDBOX_SESSION_TIMEOUT_MS = SANDBOX_VM_SESSION_TIMEOUT_MS

/** First `npm install` + Next.js boot in a new sandbox VM can take 10–40+ minutes. */
export const SANDBOX_VITE_READY_TIMEOUT_MS = Math.min(
  parsePositiveInt(process.env.SANDBOX_VITE_READY_TIMEOUT_MS, 40 * 60 * 1000),
  SANDBOX_VM_SESSION_BOOTSTRAP_MS - 60_000
)

/** Agent runner health during provision (after preview is up). */
export const SANDBOX_SERVICE_READY_TIMEOUT_MS = Math.min(
  parsePositiveInt(process.env.SANDBOX_SERVICE_READY_TIMEOUT_MS, 10 * 60 * 1000),
  SANDBOX_VITE_READY_TIMEOUT_MS
)

function parsePositiveInt(raw: string | undefined, fallback: number) {
  if (!raw?.trim()) {
    return fallback
  }

  const value = Number.parseInt(raw, 10)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

export function getPreviewRuntimeKind(): PreviewRuntimeKind {
  return "sandbox"
}

/** Persistent sandboxes keep snapshots (fast resume, counts against Hobby storage caps). */
export function sandboxPersistentEnabled(): boolean {
  const raw = process.env.APP_BUILDER_SANDBOX_PERSISTENT?.trim().toLowerCase()
  if (raw === "false" || raw === "0" || raw === "off") {
    return false
  }
  return true
}

export const SANDBOX_KEEP_LAST_SNAPSHOTS = {
  count: 1,
  deleteEvicted: true,
} as const

export function sandboxNameForSession(
  sessionId: string,
  projectId?: string
) {
  if (projectId) {
    return `app-builder-project-${projectId}`
  }
  return `app-builder-${sessionId}`
}