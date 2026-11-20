import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const clerkEnabled = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() &&
    process.env.CLERK_SECRET_KEY?.trim()
)

/**
 * Clerk updates session cookies here. API routes enforce auth via `getAppUser()`.
 * Avoiding global `auth.protect()` keeps local dev working when Edge `fetch` to Clerk is flaky.
 */
export default clerkEnabled
  ? clerkMiddleware()
  : function middleware() {
      return NextResponse.next()
    }

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}