import { provisionSandboxPreview } from "./sandbox-runtime"
import type { PreviewRuntimeHandle, PreviewSessionContext } from "./types"

export type { PreviewRuntimeKind } from "./config"
export type { PreviewRuntimeHandle } from "./types"
export { sandboxNameForSession, sandboxPersistentEnabled } from "./config"

export async function provisionPreviewRuntime(
  context: PreviewSessionContext
): Promise<PreviewRuntimeHandle> {
  return provisionSandboxPreview(context)
}