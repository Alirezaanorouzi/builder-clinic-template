import Link from "next/link"

import { AppBuilder } from "@/components/app-builder"
import { requireMultiUserMode } from "@/lib/auth/config"
import { fa } from "@/lib/i18n/fa"

export default function Home() {
  if (!requireMultiUserMode()) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:p-6">
        <div className="max-w-md space-y-4 px-1 text-center">
          <h1 className="text-lg font-semibold">{fa.setup.title}</h1>
          <p className="text-sm leading-7 text-muted-foreground">
            {fa.setup.body}
          </p>
          <p className="text-sm text-muted-foreground">
            <Link href="/sign-in" className="underline underline-offset-2">
              {fa.setup.signIn}
            </Link>{" "}
            {fa.setup.signInHint}
          </p>
        </div>
      </main>
    )
  }

  return <AppBuilder />
}