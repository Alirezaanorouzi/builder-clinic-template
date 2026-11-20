/**
 * In-memory builder sessions (agent + preview). Phase 2 can add Redis behind this API.
 */
export class BuilderSessionRegistry<T> {
  private readonly sessions = new Map<string, T>()

  get(id: string) {
    return this.sessions.get(id)
  }

  set(id: string, session: T) {
    this.sessions.set(id, session)
  }

  has(id: string) {
    return this.sessions.has(id)
  }

  delete(id: string) {
    this.sessions.delete(id)
  }
}

const globalRef = globalThis as typeof globalThis & {
  __builderSessionRegistry?: BuilderSessionRegistry<unknown>
}

export function getBuilderSessionRegistry<T>() {
  if (!globalRef.__builderSessionRegistry) {
    globalRef.__builderSessionRegistry = new BuilderSessionRegistry()
  }
  return globalRef.__builderSessionRegistry as BuilderSessionRegistry<T>
}