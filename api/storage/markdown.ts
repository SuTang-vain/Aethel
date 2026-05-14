export type FrontMatterValue = string | number | boolean | null | FrontMatterValue[] | { [key: string]: FrontMatterValue }
export type FrontMatter = Record<string, FrontMatterValue>

function encodeValue(value: FrontMatterValue): string {
  if (typeof value === 'string') return JSON.stringify(value)
  return JSON.stringify(value)
}

function decodeValue(value: string): FrontMatterValue {
  const trimmed = value.trim()
  if (!trimmed) return ''
  try {
    return JSON.parse(trimmed)
  } catch {
    if (trimmed === 'true') return true
    if (trimmed === 'false') return false
    if (trimmed === 'null') return null
    const numeric = Number(trimmed)
    return Number.isFinite(numeric) && trimmed !== '' ? numeric : trimmed
  }
}

export function stringifyMarkdown(frontMatter: FrontMatter, body: string): string {
  const lines = Object.entries(frontMatter)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${encodeValue(value)}`)

  return `---\n${lines.join('\n')}\n---\n\n${body.trim()}\n`
}

export function parseMarkdown(markdown: string): { frontMatter: FrontMatter; body: string } {
  if (!markdown.startsWith('---\n')) {
    return { frontMatter: {}, body: markdown }
  }

  const endIndex = markdown.indexOf('\n---', 4)
  if (endIndex === -1) {
    return { frontMatter: {}, body: markdown }
  }

  const rawFrontMatter = markdown.slice(4, endIndex)
  const body = markdown.slice(endIndex + 4).replace(/^\n+/, '')
  const frontMatter: FrontMatter = {}

  rawFrontMatter.split('\n').forEach((line) => {
    const separatorIndex = line.indexOf(':')
    if (separatorIndex === -1) return
    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1)
    if (!key) return
    frontMatter[key] = decodeValue(value)
  })

  return { frontMatter, body }
}

export function extractJsonBlock<T>(body: string, label: string): T | null {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = body.match(new RegExp(`\`\`\`json ${escapedLabel}\\n([\\s\\S]*?)\\n\`\`\``))
  if (!match) return null
  try {
    return JSON.parse(match[1]) as T
  } catch {
    return null
  }
}

export function stripFirstHeading(body: string) {
  return body.replace(/^# .*\n+/, '').trim()
}
