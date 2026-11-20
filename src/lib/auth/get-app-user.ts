import { auth, currentUser } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"

import { createDb } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { isClerkConfigured, isDatabaseConfigured } from "./config"

export class AuthRequiredError extends Error {
  readonly code = "auth_required"
}

export class AuthNotConfiguredError extends Error {
  readonly code = "auth_not_configured"
}

export async function getAppUser() {
  if (!isClerkConfigured() || !isDatabaseConfigured()) {
    throw new AuthNotConfiguredError()
  }

  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) {
    throw new AuthRequiredError()
  }

  const clerkUser = await currentUser()
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses?.[0]?.emailAddress

  const db = createDb()
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1)

  if (existing) {
    if (email && existing.email !== email) {
      const [updated] = await db
        .update(users)
        .set({ email })
        .where(eq(users.id, existing.id))
        .returning()
      return updated ?? existing
    }
    return existing
  }

  const [created] = await db
    .insert(users)
    .values({
      clerkUserId,
      email: email ?? null,
    })
    .returning()

  return created
}