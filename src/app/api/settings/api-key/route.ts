import { allowUserApiKeys, requireMultiUserMode } from "@/lib/auth/config"
import { clearPersistedCursorApiKey } from "@/lib/app-builder/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function DELETE() {
  if (requireMultiUserMode() || !allowUserApiKeys()) {
    return Response.json(
      { error: "User API key settings are disabled." },
      { status: 403 }
    )
  }

  await clearPersistedCursorApiKey()
  return Response.json({ ok: true })
}
