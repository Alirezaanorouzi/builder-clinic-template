/** Recognized Cursor / xAI SDK API key prefixes (legacy and integrated keys). */
export const CURSOR_API_KEY_PREFIXES = ["crsr_", "grok_"] as const

export const UNRECOGNIZED_CURSOR_API_KEY_MESSAGE =
  "Paste only the key (crsr_... or grok_...), not a full .env line like CURSOR_API_KEY=..."

const KEY_IN_TEXT_PATTERN = /\b((?:crsr_|grok_)[A-Za-z0-9_-]+)/

/** Strip whitespace, quotes, and common .env paste mistakes. */
export function normalizeCursorApiKey(value: string): string {
  let trimmed = value.trim().replace(/^["']|["']$/g, "")
  if (!trimmed) {
    return ""
  }

  const envLine = trimmed.match(/^(?:export\s+)?(?:CURSOR_)?API_KEY\s*=\s*(.+)$/i)
  if (envLine) {
    trimmed = envLine[1].trim().replace(/^["']|["']$/g, "")
  }

  if (!CURSOR_API_KEY_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
    const embedded = trimmed.match(KEY_IN_TEXT_PATTERN)
    if (embedded) {
      trimmed = embedded[1]
    }
  }

  return trimmed
}

export function isRecognizedCursorApiKey(value: string) {
  const normalized = normalizeCursorApiKey(value)
  if (!normalized) {
    return false
  }

  return CURSOR_API_KEY_PREFIXES.some((prefix) => normalized.startsWith(prefix))
}