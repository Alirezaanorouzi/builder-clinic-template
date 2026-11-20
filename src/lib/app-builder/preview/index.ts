import { getPreviewRuntimeKind } from "./config"
import { provisionLocalPreview } from "./local-runtime"
import { provisionSandboxPreview } from "./sandbox-runtime"
import type { PreviewRuntimeHandle, PreviewSessionContext } from "./types"

export type { PreviewRuntimeKind } from "./config"
export type { PreviewRuntimeHandle } from "./types"
export { getPreviewRuntimeKind } from "./config"

export async function provisionPreviewRuntime(
  context: PreviewSessionContext
): Promise<PreviewRuntimeHandle> {
  const kind = getPreviewRuntimeKind()
  if (kind === "sandbox") {
    return provisionSandboxPreview(context)
  }

  return provisionLocalPreview(context)
}