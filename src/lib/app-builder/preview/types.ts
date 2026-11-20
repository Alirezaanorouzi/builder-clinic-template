import type { PreviewRuntimeKind } from "./config"

export type PreviewSessionContext = {
  id: string
  projectId?: string
  projectPath: string
  logs: string[]
  pushLog: (line: string) => void
}

export type PreviewRuntimeHandle = {
  kind: PreviewRuntimeKind
  previewUrl: string
  /** Local loopback port; `0` when preview is remote-only (sandbox). */
  port: number
  syncFromWorkspace: (projectPath: string) => Promise<void>
  dispose: () => Promise<void>
}