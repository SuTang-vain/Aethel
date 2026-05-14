import { strict as assert } from 'node:assert'

type TestCase = {
  name: string
  run: () => Promise<void> | void
}

const tests: TestCase[] = []

function test(name: string, run: () => Promise<void> | void) {
  tests.push({ name, run })
}

const originalEnv = {
  AI_PROVIDER: process.env.AI_PROVIDER,
  MODELSCOPE_API_KEY: process.env.MODELSCOPE_API_KEY,
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  MOONSHOT_API_KEY: process.env.MOONSHOT_API_KEY,
}

function restoreEnv() {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

function clearProviderEnv() {
  delete process.env.AI_PROVIDER
  delete process.env.MODELSCOPE_API_KEY
  delete process.env.DEEPSEEK_API_KEY
  delete process.env.MOONSHOT_API_KEY
}

test('AI config infers ModelScope when only ModelScope key is configured', async () => {
  const { getAIConfigFromEnv } = await import('../../api/routes/ai.js')
  clearProviderEnv()
  process.env.MODELSCOPE_API_KEY = 'ms-test-key'

  const config = getAIConfigFromEnv()

  assert.equal(config.provider, 'modelscope')
  assert.equal(config.apiKey, 'ms-test-key')
  assert.equal(config.model, 'moonshotai/Kimi-K2.5')
})

test('AI config honors explicit provider even when another key exists', async () => {
  const { getAIConfigFromEnv } = await import('../../api/routes/ai.js')
  clearProviderEnv()
  process.env.AI_PROVIDER = 'deepseek'
  process.env.MODELSCOPE_API_KEY = 'ms-test-key'
  process.env.DEEPSEEK_API_KEY = 'deepseek-test-key'

  const config = getAIConfigFromEnv()

  assert.equal(config.provider, 'deepseek')
  assert.equal(config.apiKey, 'deepseek-test-key')
})

test('AI config falls back to ModelScope when no provider or key is configured', async () => {
  const { getAIConfigFromEnv } = await import('../../api/routes/ai.js')
  clearProviderEnv()

  const config = getAIConfigFromEnv()

  assert.equal(config.provider, 'modelscope')
  assert.equal(config.apiKey, '')
})

async function main() {
  try {
    for (const item of tests) {
      await item.run()
      console.log(`✓ ${item.name}`)
    }
  } finally {
    restoreEnv()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
