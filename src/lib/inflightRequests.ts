type PendingRequest<T> = {
  promise: Promise<T>
  subscribers: number
}

const pendingRequests = new Map<string, PendingRequest<unknown>>()

function normalizeForKey(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeForKey)
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = normalizeForKey((value as Record<string, unknown>)[key])
        return result
      }, {})
  }

  return value
}

export function createRequestKey(scope: string, payload: unknown): string {
  return `${scope}:${JSON.stringify(normalizeForKey(payload))}`
}

export function dedupeInFlight<T>(key: string, request: () => Promise<T>): Promise<T> {
  const pending = pendingRequests.get(key) as PendingRequest<T> | undefined
  if (pending) {
    pending.subscribers += 1
    return pending.promise
  }

  const entry: PendingRequest<T> = {
    subscribers: 1,
    promise: request().finally(() => {
      pendingRequests.delete(key)
    }),
  }

  pendingRequests.set(key, entry as PendingRequest<unknown>)
  return entry.promise
}

export function clearInFlightRequestsForTests() {
  pendingRequests.clear()
}
