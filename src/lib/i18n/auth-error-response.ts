import {
  AuthNotConfiguredError,
  AuthRequiredError,
} from "@/lib/auth/get-app-user"

import { apiErrors } from "@/lib/i18n/api-errors"

export function authErrorResponse(
  error: unknown,
  fallback: string = apiErrors.requestFailed
) {
  if (error instanceof AuthRequiredError) {
    return Response.json(
      { code: error.code, error: apiErrors.signInRequired },
      { status: 401 }
    )
  }
  if (error instanceof AuthNotConfiguredError) {
    return Response.json(
      { code: error.code, error: apiErrors.multiUserNotConfigured },
      { status: 503 }
    )
  }
  const message = error instanceof Error ? error.message : fallback
  return Response.json({ error: message }, { status: 500 })
}