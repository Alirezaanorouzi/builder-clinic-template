import { isRecognizedCursorApiKey, normalizeCursorApiKey } from "@/lib/app-builder/api-key"
import { readPersistedCursorApiKey } from "@/lib/app-builder/server"

import { allowUserApiKeys } from "./config"

export async function resolveServerCursorApiKey(submitted?: string | null) {
  const normalizedSubmit = submitted
    ? normalizeCursorApiKey(submitted)
    : ""
  if (
    allowUserApiKeys() &&
    normalizedSubmit &&
    isRecognizedCursorApiKey(normalizedSubmit)
  ) {
    return normalizedSubmit
  }

  const fromServer = await readPersistedCursorApiKey()
  if (!fromServer || !isRecognizedCursorApiKey(fromServer)) {
    throw new Error("Cursor API key is not configured on the server.")
  }

  return fromServer
}