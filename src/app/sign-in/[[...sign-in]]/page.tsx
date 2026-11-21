import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <SignIn fallbackRedirectUrl="/" signUpUrl="/sign-up" />
    </div>
  )
}