import { isDatabaseUrlConfigured } from "@/lib/db/database-url"

/** Cloud builder: users never paste API keys (server uses CURSOR_API_KEY). */
export function allowUserApiKeys() {
  return process.env.ALLOW_USER_API_KEYS === "true"
}

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