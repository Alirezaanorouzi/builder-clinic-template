import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <SignUp fallbackRedirectUrl="/" signInUrl="/sign-in" />
    </div>
  )
}