import { strict as assert } from 'node:assert'
import { writeFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { zipSync, strToU8 } from 'fflate'
import { jsPDF } from 'jspdf'
import {
  parsePrdFile,
  PRD_UPLOAD_MAX_BYTES,
  isSupportedPrdFile,
} from '../../src/lib/prdFileParser.js'

type TestCase = {
  name: string
  run: () => Promise<void>
}

const tests: TestCase[] = []

function test(name: string, run: () => Promise<void>) {
  tests.push({ name, run })
}

function fileFromBytes(name: string, bytes: Uint8Array, type: string) {
  return new File([bytes], name, { type })
}

function buildDocxBytes(text: string) {
  return zipSync({
    '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),
    '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'),
    'word/document.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`),
  })
}

test('PRD file parser normalizes Markdown and builds preview metadata', async () => {
  const file = new File(['# PRD\r\n\r\n目标用户：产品经理\n\n\n核心流程：气泡到 PRD'], 'input.md', { type: 'text/markdown' })
  const parsed = await parsePrdFile(file)

  assert.equal(isSupportedPrdFile(file), true)
  assert.equal(parsed.fileType, 'markdown')
  assert.equal(parsed.fileName, 'input.md')
  assert.match(parsed.text, /目标用户/)
  assert.ok(parsed.summary.includes('目标用户'))
  assert.equal(parsed.characterCount, parsed.text.length)
  assert.ok(PRD_UPLOAD_MAX_BYTES >= 8 * 1024 * 1024)
})

test('PRD file parser extracts DOCX raw text', async () => {
  const file = fileFromBytes(
    'design.docx',
    buildDocxBytes('前端 DESIGN.md 需要描述组件结构和响应式规则'),
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  )
  const parsed = await parsePrdFile(file)

  assert.equal(parsed.fileType, 'docx')
  assert.match(parsed.text, /组件结构/)
  assert.match(parsed.summary, /响应式规则/)
})

test('PRD file parser extracts PDF text', async () => {
  const pdf = new jsPDF()
  pdf.text('PDF PRD upload keeps source file context', 10, 10)
  const file = fileFromBytes('upload.pdf', new Uint8Array(pdf.output('arraybuffer')), 'application/pdf')
  const parsed = await parsePrdFile(file)

  assert.equal(parsed.fileType, 'pdf')
  assert.match(parsed.text, /source file context/)
})

test('PRD file parser rejects unrelated binary extensions', async () => {
  const file = new File([new Uint8Array([1, 2, 3])], 'image.png', { type: 'image/png' })
  assert.equal(isSupportedPrdFile(file), false)
})

async function main() {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'aethel-p1-parser-'))
  try {
    await writeFile(path.join(tempDir, '.keep'), '')
    for (const item of tests) {
      await item.run()
      console.log(`✓ ${item.name}`)
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
