import { strict as assert } from 'node:assert'
import {
  clearInFlightRequestsForTests,
  createRequestKey,
  dedupeInFlight,
} from '../../src/lib/inflightRequests.js'

type TestCase = {
  name: string
  run: () => Promise<void>
}

const tests: TestCase[] = []

function test(name: string, run: () => Promise<void>) {
  tests.push({ name, run })
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

test('createRequestKey is stable for object key order', async () => {
  assert.equal(
    createRequestKey('scope', { b: 2, a: { y: 1, x: 0 } }),
    createRequestKey('scope', { a: { x: 0, y: 1 }, b: 2 }),
  )
})

test('dedupeInFlight reuses only identical pending payloads', async () => {
  clearInFlightRequestsForTests()
  let callCount = 0
  const payload = { input: 'same' }
  const key = createRequestKey('ai:test', payload)

  const first = dedupeInFlight(key, async () => {
    callCount += 1
    await wait(20)
    return { value: 'shared' }
  })
  const second = dedupeInFlight(key, async () => {
    callCount += 1
    return { value: 'wrong' }
  })

  assert.equal(await first, await second)
  assert.equal(callCount, 1)

  const different = await dedupeInFlight(createRequestKey('ai:test', { input: 'different' }), async () => {
    callCount += 1
    return { value: 'different' }
  })

  assert.deepEqual(different, { value: 'different' })
  assert.equal(callCount, 2)
})

async function main() {
  try {
    for (const item of tests) {
      await item.run()
      console.log(`✓ ${item.name}`)
    }
  } finally {
    clearInFlightRequestsForTests()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
