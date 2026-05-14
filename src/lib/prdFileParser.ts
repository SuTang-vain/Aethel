export interface ParsedPrdFile {
  fileName: string
  fileType: 'markdown' | 'text' | 'html' | 'json' | 'csv' | 'pdf' | 'docx'
  text: string
  summary: string
  characterCount: number
  byteSize: number
}

const TEXT_EXTENSIONS = new Set(['md', 'markdown', 'txt', 'text', 'csv'])
const SUPPORTED_EXTENSIONS = new Set([...TEXT_EXTENSIONS, 'html', 'htm', 'json', 'pdf', 'docx'])

export const PRD_UPLOAD_ACCEPT = [
  '.md',
  '.markdown',
  '.txt',
  '.text',
  '.html',
  '.htm',
  '.json',
  '.csv',
  '.pdf',
  '.docx',
].join(',')

export const PRD_UPLOAD_MAX_BYTES = 8 * 1024 * 1024

export function getFileExtension(fileName: string) {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)
  return match?.[1] || ''
}

export function isSupportedPrdFile(file: File) {
  const extension = getFileExtension(file.name)
  return (
    SUPPORTED_EXTENSIONS.has(extension)
    || file.type.startsWith('text/')
    || file.type === 'application/json'
    || file.type === 'application/pdf'
    || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
}

function normalizePlainText(rawText: string) {
  return rawText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

function normalizeHtmlText(rawText: string) {
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(rawText, 'text/html')
    return normalizePlainText(doc.body.textContent || rawText)
  }

  return normalizePlainText(rawText.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' '))
}

function normalizeJsonText(rawText: string) {
  try {
    return JSON.stringify(JSON.parse(rawText), null, 2)
  } catch {
    return normalizePlainText(rawText)
  }
}

function inferFileType(file: File): ParsedPrdFile['fileType'] {
  const extension = getFileExtension(file.name)
  if (extension === 'pdf' || file.type === 'application/pdf') return 'pdf'
  if (extension === 'docx' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx'
  if (extension === 'html' || extension === 'htm' || file.type === 'text/html') return 'html'
  if (extension === 'json' || file.type === 'application/json') return 'json'
  if (extension === 'csv') return 'csv'
  if (extension === 'md' || extension === 'markdown') return 'markdown'
  return 'text'
}

export function normalizeUploadedPrdText(file: File, rawText: string) {
  const fileType = inferFileType(file)
  if (fileType === 'html') return normalizeHtmlText(rawText)
  if (fileType === 'json') return normalizeJsonText(rawText)
  return normalizePlainText(rawText)
}

async function parsePdfFile(file: File) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = typeof window === 'undefined' && typeof import.meta.resolve === 'function'
    ? import.meta.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')
    : new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString()

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    useWorkerFetch: false,
    isOffscreenCanvasSupported: false,
    isImageDecoderSupported: false,
  })

  const pdf = await loadingTask.promise
  const pageTexts: string[] = []

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const textContent = await page.getTextContent()
      const text = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (text) pageTexts.push(text)
    }
  } finally {
    await pdf.destroy()
  }

  return normalizePlainText(pageTexts.join('\n\n'))
}

async function parseDocxFile(file: File) {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const input = typeof globalThis.Buffer !== 'undefined'
    ? { buffer: Buffer.from(arrayBuffer) }
    : { arrayBuffer }
  const result = await mammoth.extractRawText(input)
  return normalizePlainText(result.value || '')
}

function buildFileSummary(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180)
}

export async function parsePrdFile(file: File): Promise<ParsedPrdFile> {
  const fileType = inferFileType(file)
  let text = ''

  if (fileType === 'pdf') {
    text = await parsePdfFile(file)
  } else if (fileType === 'docx') {
    text = await parseDocxFile(file)
  } else {
    text = normalizeUploadedPrdText(file, await file.text())
  }

  return {
    fileName: file.name,
    fileType,
    text,
    summary: buildFileSummary(text),
    characterCount: text.length,
    byteSize: file.size,
  }
}
