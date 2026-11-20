/**
 * Delete lingering Vercel Sandboxes created by app-builder (frees Hobby snapshot storage).
 * Requires .env.local with VERCEL_OIDC_TOKEN from `npx vercel link` + `vercel env pull`.
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

console.log(`Found ${sandboxes.length} sandbox(es). Deleting…`)

let deleted = 0
for (const item of sandboxes) {
  const name = item.name
  const status = item.status
  console.log(`- ${name} (${status})`)

  try {
    const sandbox = await Sandbox.get({ name })
    if (status === "running" || status === "pending") {
      await sandbox.stop()
    }
    await sandbox.delete({ deleteOrphanSnapshots: true })
    deleted += 1
    console.log("  deleted")
  } catch (error) {
    console.error(`  failed:`, error instanceof Error ? error.message : error)
  }
}

console.log(`Done. Deleted ${deleted} sandbox(es).`)