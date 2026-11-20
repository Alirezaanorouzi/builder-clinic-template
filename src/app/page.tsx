import { AppBuilder } from "@/components/app-builder"
import { requireMultiUserMode } from "@/lib/auth/config"

export default function Home() {
  return <AppBuilder multiUserEnabled={requireMultiUserMode()} />
}
