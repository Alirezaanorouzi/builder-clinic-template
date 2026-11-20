import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

import * as schema from "./schema"
import { resolveDatabaseUrl } from "./database-url"

function getDatabaseUrl() {
  const url = resolveDatabaseUrl()
  if (!url) {
    throw new Error(
      "Database URL is not configured. Set DATABASE_URL or connect Neon on Vercel."
    )
  }
  return url
}

export function createDb() {
  const sql = neon(getDatabaseUrl())
  return drizzle(sql, { schema })
}

export type Db = ReturnType<typeof createDb>

export { schema }