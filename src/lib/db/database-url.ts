const DATABASE_URL_KEYS = [
  "DATABASE_URL",
  /** Vercel Marketplace Neon integration */
  "DATABASE_URL_DATABASE_URL",
  "DATABASE_URL_POSTGRES_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
] as const

export function resolveDatabaseUrl(): string | undefined {
  for (const key of DATABASE_URL_KEYS) {
    const value = process.env[key]?.trim()
    if (value) {
      return value
    }
  }
  return undefined
}

export function isDatabaseUrlConfigured() {
  return Boolean(resolveDatabaseUrl())
}