import { strict as assert } from 'node:assert'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { chromium, type Browser, type Page, type Route } from 'playwright-core'
import { createServer, type ViteDevServer } from 'vite'

type TestCase = {
  name: string
  run: (ctx: { page: Page; baseUrl: string }) => Promise<void>
}

const tests: TestCase[] = []

function test(name: string, run: TestCase['run']) {
  tests.push({ name, run })
}

function chromePath() {
  return process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
}

async function startViteServer() {
  const server = await createServer({
    server: {
      host: '127.0.0.1',
      port: 0,
      strictPort: false,
    },
    clearScreen: false,
    logLevel: 'error',
  })
  await server.listen()
  const baseUrl = server.resolvedUrls?.local[0]
  if (!baseUrl) throw new Error('Failed to start Vite UI test server')
  return { server, baseUrl: baseUrl.replace(/\/$/, '') }
}

async function routeMockAi(route: Route) {
  const request = route.request()
  const url = request.url()

  if (url.endsWith('/api/ai/workshop-skill')) {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        analysisSummary: '已拆出两个工坊气泡。',
        needsConfirmation: false,
        confidence: 0.91,
        confirmationPrompt: '',
        clarificationQuestions: [],
        candidateBubbles: [
          {
            title: '上传来源',
            content: '来自上传文档的核心目标',
            tag: 'PRD拆解',
            rationale: '来自 UI 测试 mock',
          },
          {
            title: '验收标准',
            content: '支持工坊到 PRD 的接力验证',
            tag: 'PRD拆解',
            rationale: '来自 UI 测试 mock',
          },
        ],
        suggestedNextActions: ['生成气泡'],
      }),
    })
  }

  if (url.endsWith('/api/ai/generate-prd-sections')) {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        sections: [{
          groupId: 'tag:PRD拆解',
          title: '核心体验',
          content: '## 目标\n工坊上传后可以直接进入 PRD 输出。',
        }],
      }),
    })
  }

  return route.continue()
}

function buildSeedWorkspace() {
  const now = new Date().toISOString()
  return {
    bubbles: [
      {
        id: 'ui-b1',
        content: '选区气泡 A',
        tag: '体验',
        color: '#ad2c0d',
        categoryId: '',
        x: -80,
        y: -20,
        interactionWeight: 1,
        prdUsageCount: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'ui-b2',
        content: '选区气泡 B',
        tag: '体验',
        color: '#ad2c0d',
        categoryId: '',
        x: 90,
        y: 20,
        interactionWeight: 1,
        prdUsageCount: 0,
        createdAt: now,
        updatedAt: now,
      },
    ],
    categories: [],
    relations: [],
    extensions: [],
    revisions: [],
    snapshots: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    filterTag: null,
    canvasMode: 'select',
  }
}

test('workshop upload fills PRD input and shows preview summary', async ({ page, baseUrl }) => {
  await page.goto(`${baseUrl}/workshop?skill=prd-to-bubbles`)
  const uploadFile = path.join(process.cwd(), 'tests/fixtures/workshop-prd.md')
  await page.locator('input[type="file"]').setInputFiles(uploadFile)

  await expectValue(page, '[data-testid="prd-input"]', /外部文档/)
  await assertVisibleText(page, '[data-testid="prd-file-preview"]', /MARKDOWN/)
  await assertVisibleText(page, '[data-testid="prd-file-preview"]', /气泡化/)
})

test('unsupported upload shows a clear error', async ({ page, baseUrl }) => {
  await page.goto(`${baseUrl}/workshop?skill=prd-to-bubbles`)
  const uploadFile = path.join(process.cwd(), 'tests/fixtures/unsupported.bin')
  await page.locator('input[type="file"]').setInputFiles(uploadFile)

  await assertVisibleText(page, '[data-testid="prd-upload-error"]', /暂支持/)
})

test('workshop generated bubbles carry into PRD and export uses edited section', async ({ page, baseUrl }) => {
  await page.goto(`${baseUrl}/workshop?skill=prd-to-bubbles`)
  await page.locator('input[type="file"]').setInputFiles(path.join(process.cwd(), 'tests/fixtures/workshop-prd.md'))
  await page.getByTestId('run-workshop-skill').click()
  await assertVisibleText(page, 'body', /已拆出两个工坊气泡/)
  await page.getByTestId('create-workshop-bubbles').click()
  await page.getByTestId('go-to-prd-output').click()

  await assertVisibleText(page, '[data-testid="prd-bubble-selector"]', /已接收工坊生成的 2 个气泡/)
  await page.getByTestId('generate-prd').click()
  await assertVisibleText(page, 'body', /核心体验/)

  const editor = page.getByTestId('prd-section-editor').first()
  await editor.fill('## 已编辑章节\n导出的 Markdown 必须来自编辑后的 section。')

  await page.evaluate(() => {
    const originalCreateObjectUrl = URL.createObjectURL.bind(URL)
    ;(window as typeof window & { __aethelDownloads?: string[] }).__aethelDownloads = []
    URL.createObjectURL = (blob: Blob | MediaSource) => {
      if (blob instanceof Blob) {
        blob.text().then((text) => {
          ;(window as typeof window & { __aethelDownloads?: string[] }).__aethelDownloads?.push(text)
        })
      }
      return originalCreateObjectUrl(blob)
    }
  })

  await page.getByTestId('export-markdown').click()
  await waitFor(async () => page.evaluate(() => Boolean((window as typeof window & { __aethelDownloads?: string[] }).__aethelDownloads?.length)))
  const downloads = await page.evaluate(() => (window as typeof window & { __aethelDownloads?: string[] }).__aethelDownloads || [])
  assert.match(downloads[0], /已编辑章节/)
  assert.match(downloads[0], /编辑后的 section/)
})

test('selection chips and snapshot preselection reflect selected bubbles', async ({ page, baseUrl }) => {
  const workspace = buildSeedWorkspace()
  await page.route('**/api/workspace', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, workspace }),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, workspace }),
    })
  })
  await page.goto(baseUrl)
  await page.waitForFunction(() => {
    const store = JSON.parse(window.localStorage.getItem('aethel-bubble-store') || '{}')
    return Array.isArray(store.state?.bubbles) && store.state.bubbles.some((bubble: { id?: string }) => bubble.id === 'ui-b1')
  })
  await page.evaluate(() => {
    const store = JSON.parse(window.localStorage.getItem('aethel-bubble-store') || '{}')
    store.state.selectedBubbleIds = ['ui-b1', 'ui-b2']
    store.state.activeBubbleId = 'ui-b1'
    store.state.selectedBubbleId = 'ui-b1'
    store.state.canvasMode = 'select'
    window.localStorage.setItem('aethel-bubble-store', JSON.stringify(store))
  })
  await page.reload()

  await assertVisibleText(page, 'body', /已选 2 个气泡/)
  assert.equal(await page.getByTestId('selected-bubble-chip-remove').count(), 2)
  await page.getByTestId('selected-bubble-chip-remove').first().click()
  await waitFor(async () => (await page.getByTestId('selected-bubble-chip-remove').count()) === 1)
  if ((await page.getByTestId('snapshot-bubble-included').count()) === 0) {
    await page.getByRole('button', { name: '快照', exact: true }).click()
  }
  await waitFor(async () => (await page.getByTestId('snapshot-bubble-included').count()) === 1)
  await page.unroute('**/api/workspace')
})

async function expectValue(page: Page, selector: string, pattern: RegExp) {
  await page.waitForFunction(
    ({ selector: currentSelector, source }) => {
      const element = document.querySelector(currentSelector) as HTMLInputElement | HTMLTextAreaElement | null
      return Boolean(element && new RegExp(source).test(element.value))
    },
    { selector, source: pattern.source },
  )
}

async function assertVisibleText(page: Page, selector: string, pattern: RegExp) {
  await page.locator(selector).filter({ hasText: pattern }).first().waitFor({ state: 'visible' })
}

async function waitFor(assertion: () => boolean | Promise<boolean>, timeout = 5000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeout) {
    if (await assertion()) return
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error('Timed out waiting for assertion')
}

async function run() {
  process.env.NODE_ENV = 'test'
  process.env.AETHEL_DATA_DIR = await mkdtemp(path.join(tmpdir(), 'aethel-p1-ui-data-'))

  const { server, baseUrl } = await startViteServer()
  let browser: Browser | null = null

  try {
    browser = await chromium.launch({
      executablePath: chromePath(),
      headless: true,
    })
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
    await page.route('**/api/ai/**', routeMockAi)

    for (const item of tests) {
      await page.context().clearCookies()
      await page.evaluate(() => window.localStorage.clear()).catch(() => undefined)
      await item.run({ page, baseUrl })
      console.log(`✓ ${item.name}`)
    }
  } finally {
    if (browser) await browser.close()
    await (server as ViteDevServer).close()
    await rm(process.env.AETHEL_DATA_DIR!, { recursive: true, force: true })
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
