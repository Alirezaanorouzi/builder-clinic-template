/**
 * Stop lingering Vercel Sandboxes created by app-builder (frees Hobby concurrency slots).
 * Requires .env.local with VERCEL_OIDC_TOKEN from `npx vercel link`.
 */
import path from "node:path"
import { fileURLToPath } from "node:url"
import { config } from "dotenv"
import { Sandbox } from "@vercel/sandbox"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
config({ path: path.join(root, ".env.local") })

const PREFIX = "app-builder-"

const result = await Sandbox.list({ namePrefix: PREFIX, sortBy: "name" })
const sandboxes = await result.toArray()

if (sandboxes.length === 0) {
  console.log(`No sandboxes found with prefix "${PREFIX}".`)
  process.exit(0)
}

console.log(`Found ${sandboxes.length} sandbox(es). Stopping…`)

let stopped = 0
for (const item of sandboxes) {
  const name = item.name
  const status = item.status
  console.log(`- ${name} (${status})`)

  if (status === "running" || status === "pending") {
    const sandbox = await Sandbox.get({ name })
    await sandbox.stop()
    stopped += 1
    console.log(`  stopped`)
  }
}

console.log(`Done. Stopped ${stopped} running sandbox(es).`)