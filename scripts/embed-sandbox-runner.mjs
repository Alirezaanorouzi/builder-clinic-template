import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const source = readFileSync(
  path.join(root, "src/lib/app-builder/sandbox/agent-runner.mjs")
)
const base64 = source.toString("base64")
const out = `import { Buffer } from "node:buffer"

/** Synced from agent-runner.mjs via \`npm run embed:runner\`. */
export const SANDBOX_AGENT_RUNNER_MJS = Buffer.from(${JSON.stringify(base64)}, "base64")
`
writeFileSync(
  path.join(root, "src/lib/app-builder/sandbox/agent-runner.embedded.ts"),
  out
)
console.log("Wrote agent-runner.embedded.ts")