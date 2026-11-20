import { config as loadEnv } from "dotenv"
import { resolve } from "node:path"
import { defineConfig } from "drizzle-kit"

loadEnv({ path: resolve(process.cwd(), ".env.local") })
loadEnv({ path: resolve(process.cwd(), ".env") })

function resolveDatabaseUrlForCli() {
  const keys = [
    "DATABASE_URL",
    "DATABASE_URL_POSTGRES_URL",
    "DATABASE_URL_DATABASE_URL",
    "POSTGRES_URL",
    "POSTGRES_PRISMA_URL",
  ] as const
  for (const key of keys) {
    const value = process.env[key]?.trim()
    if (value) {
      return value
    }
  }
  return undefined
}

const url = resolveDatabaseUrlForCli()

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: url ?? "",
  },
})