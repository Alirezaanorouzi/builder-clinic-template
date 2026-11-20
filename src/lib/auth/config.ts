/** When false (production default), users cannot paste their own Cursor API key. */
export function allowUserApiKeys() {
  if (process.env.ALLOW_USER_API_KEYS === "true") {
    return true
  }
  if (process.env.ALLOW_USER_API_KEYS === "false") {
    return false
  }
  return process.env.NODE_ENV !== "production"
}

import { isDatabaseUrlConfigured } from "@/lib/db/database-url"

export function isDatabaseConfigured() {
  return isDatabaseUrlConfigured()
}

export function isClerkConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() &&
      process.env.CLERK_SECRET_KEY?.trim()
  )
}

export function requireMultiUserMode() {
  return isDatabaseConfigured() && isClerkConfigured()
}