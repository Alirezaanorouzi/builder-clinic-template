import { allowUserApiKeys, requireMultiUserMode } from "@/lib/auth/config"
import { getPreviewRuntimeKind } from "@/lib/app-builder/preview/config"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  return Response.json({
    multiUser: requireMultiUserMode(),
    allowUserApiKeys: allowUserApiKeys(),
    previewRuntime: getPreviewRuntimeKind(),
  })
}