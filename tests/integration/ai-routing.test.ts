import { strict as assert } from 'node:assert'
import http from 'node:http'

type TestCase = {
  name: string
  run: () => Promise<void>
}

const tests: TestCase[] = []

function test(name: string, run: () => Promise<void>) {
  tests.push({ name, run })
}

async function listen(app: http.RequestListener) {
  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Failed to start integration test server')
  }
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  }
}

async function request(baseUrl: string, method: string, pathname: string, body?: unknown) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const payload = await response.json()
  return { response, payload }
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

function setEnv(env: Partial<Record<keyof typeof originalEnv, string>>) {
  delete process.env.AI_PROVIDER
  delete process.env.MODELSCOPE_API_KEY
  delete process.env.DEEPSEEK_API_KEY
  delete process.env.MOONSHOT_API_KEY
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) process.env[key] = value
  }
}

async function main() {
  process.env.NODE_ENV = 'test'
  setEnv({
    AI_PROVIDER: 'auto',
    MODELSCOPE_API_KEY: 'ms-test-key',
    DEEPSEEK_API_KEY: 'deepseek-test-key',
    MOONSHOT_API_KEY: 'moonshot-test-key',
  })

  const aiRoutes = await import('../../api/routes/ai.js')
  const { default: app } = await import('../../api/app.js')
  const calls: Array<{ model: string; messages: Array<{ role: string; content: string }>; max_tokens?: number; max_completion_tokens?: number; extra_body?: unknown }> = []

  aiRoutes.clearAIResponseCacheForTests()
  aiRoutes.clearAIMetricsForTests()
  aiRoutes.setAICompletionOverrideForTests(async (payload) => {
    calls.push(payload as { model: string; messages: Array<{ role: string; content: string }>; max_tokens?: number; max_completion_tokens?: number; extra_body?: unknown })

    if (
      payload.model === 'moonshotai/Kimi-K2.5'
      && calls.length === 1
      && payload.messages[0]?.content.includes('碎片化的灵感进行归类整理')
    ) {
      throw new Error('429 rate limit')
    }

    if (payload.messages[0]?.content.includes('碎片化的灵感进行归类整理')) {
      return {
        choices: [{
          message: {
            content: JSON.stringify({
              categories: [{ name: '体验', description: '体验类', bubbleIds: ['b1'], confidence: 1 }],
              suggestedTags: [],
              relations: [],
            }),
          },
        }],
      }
    }

    if (payload.messages[0]?.content.includes('PRD 分章节草稿')) {
      return {
        choices: [{
          message: {
            content: JSON.stringify({
              sections: [{ groupId: 'core', title: '核心体验', content: '## 目标\n完成核心体验。' }],
            }),
          },
        }],
      }
    }

    if (payload.messages[0]?.content.includes('认知负荷优化专家')) {
      if (payload.model === 'moonshotai/Kimi-K2.5') {
        return { choices: [{ message: { content: '{}' } }] }
      }
      return {
        choices: [{
          message: {
            content: JSON.stringify({
              statusSnapshot: '二轮快照通过 fallback provider 形成。',
              logicFlow: '第一个 provider 返回空结构后，路由应继续尝试下一个 provider。',
              cognitiveGaps: ['继续验证二轮稳定性'],
              semanticAnchors: [{ label: '二轮稳定性', reason: '避免空 JSON 触发本地模板快照', bubbleIds: ['b1'] }],
              wakeTrigger: '继续验证快照二轮生成。',
              level2: [{ anchor: '二轮稳定性', summary: 'schema 错误会触发 provider fallback。', bubbleIds: ['b1'] }],
              level3: [{ bubbleId: 'b1', source: 'mock', deepLogic: '来自第二个 provider。' }],
            }),
          },
        }],
      }
    }

    return { choices: [{ message: { content: '{}' } }] }
  })

  const { server, baseUrl } = await listen(app)

  test('auto routing falls back and records metrics for fast-json tasks', async () => {
    const { response, payload } = await request(baseUrl, 'POST', '/api/ai/categorize', {
      bubbles: [{ id: 'b1', content: '需要快速归类', tag: '体验' }],
    })
    const config = await request(baseUrl, 'GET', '/api/ai/config')

    assert.equal(response.status, 200)
    assert.equal(payload.success, true)
    assert.equal(calls[0].model, 'moonshotai/Kimi-K2.5')
    assert.equal(calls[1].model, 'deepseek-v4-pro')
    assert.deepEqual(calls[1].extra_body, { thinking: { type: 'disabled' } })
    assert.equal(config.payload.metrics[0].provider, 'deepseek')
    assert.equal(config.payload.metrics[0].profile, 'fast-json')
    assert.match(config.payload.metrics[0].fallbackReason, /429/)
  })

  test('manual provider overrides auto routing and uses Moonshot token cap', async () => {
    calls.splice(0)
    aiRoutes.clearAIResponseCacheForTests()
    await request(baseUrl, 'POST', '/api/ai/config', {
      provider: 'moonshot',
      apiKey: 'moonshot-test-key',
      model: 'kimi-k2.6',
    })

    const { response, payload } = await request(baseUrl, 'POST', '/api/ai/generate-prd-sections', {
      groups: [{ id: 'core', title: '核心体验', tag: '体验', bubbles: [{ id: 'b1', content: '生成章节' }] }],
    })

    assert.equal(response.status, 200)
    assert.equal(payload.sections[0].groupId, 'core')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].model, 'kimi-k2.6')
    assert.equal(calls[0].max_completion_tokens, 2200)
  })

  test('snapshot schema failure falls back to the next provider', async () => {
    calls.splice(0)
    aiRoutes.clearAIResponseCacheForTests()
    aiRoutes.clearAIMetricsForTests()
    await request(baseUrl, 'POST', '/api/ai/config', {
      provider: 'auto',
      apiKey: 'ms-test-key',
      model: 'moonshotai/Kimi-K2.5',
    })

    const { response, payload } = await request(baseUrl, 'POST', '/api/ai/snapshot', {
      bubbles: [{ id: 'b1', content: '第二轮快照不应该退成本地模板', tag: '二轮稳定性' }],
      categories: [{ name: '二轮稳定性', description: 'schema fallback 验证' }],
    })
    const config = await request(baseUrl, 'GET', '/api/ai/config')
    const snapshotCalls = calls.filter((call) => call.messages[0]?.content.includes('认知负荷优化专家'))

    assert.equal(response.status, 200)
    assert.equal(payload.success, true)
    assert.equal(payload.statusSnapshot, '二轮快照通过 fallback provider 形成。')
    assert.equal(snapshotCalls[0].model, 'moonshotai/Kimi-K2.5')
    assert.equal(snapshotCalls[1].model, 'deepseek-v4-pro')
    assert.equal(snapshotCalls[0].max_tokens, 6000)
    assert.equal(snapshotCalls[1].max_tokens, 6000)
    assert.match(config.payload.metrics[0].fallbackReason, /schema failed/)
  })

  test('snapshot generation does not reuse the AI response cache', async () => {
    calls.splice(0)
    aiRoutes.clearAIResponseCacheForTests()
    await request(baseUrl, 'POST', '/api/ai/config', {
      provider: 'deepseek',
      apiKey: 'deepseek-test-key',
      model: 'deepseek-v4-pro',
    })

    const payload = {
      bubbles: [{ id: 'b1', content: '连续生成快照应该重新请求模型', tag: '缓存验证' }],
      categories: [{ name: '缓存验证', description: '连续快照生成不复用缓存' }],
    }

    const first = await request(baseUrl, 'POST', '/api/ai/snapshot', payload)
    const second = await request(baseUrl, 'POST', '/api/ai/snapshot', payload)
    const snapshotCalls = calls.filter((call) => call.messages[0]?.content.includes('认知负荷优化专家'))

    assert.equal(first.response.status, 200)
    assert.equal(second.response.status, 200)
    assert.equal(snapshotCalls.length, 2)
    assert.equal(snapshotCalls[0].model, 'deepseek-v4-pro')
    assert.equal(snapshotCalls[1].model, 'deepseek-v4-pro')
  })

  try {
    for (const item of tests) {
      await item.run()
      console.log(`✓ ${item.name}`)
    }
  } finally {
    aiRoutes.setAICompletionOverrideForTests(null)
    restoreEnv()
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve())
    })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
