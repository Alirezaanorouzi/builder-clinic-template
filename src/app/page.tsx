import Link from "next/link"

import { AppBuilder } from "@/components/app-builder"
import { requireMultiUserMode } from "@/lib/auth/config"

export default function Home() {
  if (!requireMultiUserMode()) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:p-6">
        <div className="max-w-md space-y-4 px-1 text-center">
          <h1 className="text-lg font-semibold">Cloud builder setup</h1>
          <p className="text-sm text-muted-foreground">
            Add Clerk keys and <code className="text-xs">DATABASE_URL</code>, run{" "}
            <code className="text-xs">npm run db:push</code>, and set{" "}
            <code className="text-xs">CURSOR_API_KEY</code> on the server.
          </p>
          <p className="text-sm text-muted-foreground">
            <Link href="/sign-in" className="underline underline-offset-2">
              Sign in
            </Link>{" "}
            once auth is configured.
          </p>
        </div>
      </main>
    )
  }

  return <AppBuilder />
}