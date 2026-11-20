import { promises as fs } from "node:fs"
import path from "node:path"

const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", ".vite", ".next"])

export type WorkspaceFile = {
  path: string
  content: Buffer
}

export async function collectWorkspaceFiles(
  workspaceRoot: string
): Promise<WorkspaceFile[]> {
  const files: WorkspaceFile[] = []

  async function walk(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) {
        continue
      }

      const absolutePath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        await walk(absolutePath)
        continue
      }

      const relativePath = path
        .relative(workspaceRoot, absolutePath)
        .split(path.sep)
        .join("/")

      files.push({
        path: relativePath,
        content: await fs.readFile(absolutePath),
      })
    }
  }

  await walk(workspaceRoot)
  return files
}