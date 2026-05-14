const queues = new Map<string, Promise<unknown>>()

export async function enqueueWrite<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = queues.get(key) || Promise.resolve()

  const next = previous
    .catch(() => undefined)
    .then(task)
    .catch((err) => {
      console.error(`Write queue error [${key}]:`, err)
      throw err
    })
    .finally(() => {
      if (queues.get(key) === next) {
        queues.delete(key)
      }
    })

  queues.set(key, next)
  return next
}
