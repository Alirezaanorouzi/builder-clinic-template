import os from "node:os"
import path from "node:path"

/**
 * Agent workspace + template mirror on disk. On Vercel only `/tmp` is writable
 * (see https://vercel.com/docs/functions/runtimes#file-system-support).
 */
export function resolveAppBuilderRoot(): string {
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), ".app-builder")
  }
  return path.join(os.homedir(), ".app-builder")
}