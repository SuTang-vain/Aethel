import { mkdir, readFile, readdir, rename } from 'fs/promises'
import path from 'path'
import { safeId, snapshotsDir, trashDir } from './paths.js'
import { extractJsonBlock, parseMarkdown, stringifyMarkdown } from './markdown.js'
import { atomicWriteFile } from './atomicWrite.js'
import { enqueueWrite } from './writeQueue.js'
import type { StoredSnapshot } from './types.js'

function snapshotPath(id: string) {
  return path.join(snapshotsDir, `${safeId(id)}.md`)
}

export async function ensureSnapshotDir() {
  await mkdir(snapshotsDir, { recursive: true })
}

export function snapshotToMarkdown(snapshot: StoredSnapshot) {
  const cognition = snapshot.cognition || {}
  const bubbleIds = snapshot.canvasState.bubbles.map((bubble) => bubble.id)
  const anchors = Array.isArray(cognition.semanticAnchors)
    ? cognition.semanticAnchors.map((anchor) => typeof anchor === 'object' && anchor !== null ? String((anchor as { label?: string }).label || '') : '').filter(Boolean)
    : []

  const body = [
    `# ${snapshot.name}`,
    '',
    '## Current State Snapshot',
    '',
    String(cognition.statusSnapshot || ''),
    '',
    '## Logic Flow',
    '',
    String(cognition.logicFlow || ''),
    '',
    '## Wake Trigger',
    '',
    String(cognition.wakeTrigger || ''),
    '',
    '## AetheL Snapshot Payload',
    '',
    '```json aethel-snapshot',
    JSON.stringify(snapshot, null, 2),
    '```',
  ].join('\n')

  return stringifyMarkdown({
    id: snapshot.id,
    name: snapshot.name,
    createdAt: snapshot.createdAt,
    bubbleIds,
    semanticAnchors: anchors,
  }, body)
}

export function markdownToSnapshot(markdown: string): StoredSnapshot | null {
  const { body } = parseMarkdown(markdown)
  return extractJsonBlock<StoredSnapshot>(body, 'aethel-snapshot')
}

export async function readSnapshots() {
  await ensureSnapshotDir()
  const files = (await readdir(snapshotsDir)).filter((file) => file.endsWith('.md')).sort()
  const snapshots = await Promise.all(files.map(async (file) => {
    const markdown = await readFile(path.join(snapshotsDir, file), 'utf8')
    return markdownToSnapshot(markdown)
  }))

  return snapshots
    .filter((snapshot): snapshot is StoredSnapshot => Boolean(snapshot))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function writeSnapshot(snapshot: StoredSnapshot) {
  await ensureSnapshotDir()
  await enqueueWrite(`snapshot:${safeId(snapshot.id)}`, () => (
    atomicWriteFile(snapshotPath(snapshot.id), snapshotToMarkdown(snapshot))
  ))
}

export async function moveSnapshotToTrash(id: string) {
  await ensureSnapshotDir()
  await mkdir(path.join(trashDir, 'snapshots'), { recursive: true })
  const from = snapshotPath(id)
  const to = path.join(trashDir, 'snapshots', `${safeId(id)}-${Date.now()}.md`)
  await enqueueWrite(`snapshot:${safeId(id)}`, async () => {
    try {
      await rename(from, to)
    } catch {
      // Already absent.
    }
  })
}

export async function syncSnapshotFiles(snapshots: StoredSnapshot[]) {
  await ensureSnapshotDir()
  const activeIds = new Set(snapshots.map((snapshot) => safeId(snapshot.id)))
  const files = (await readdir(snapshotsDir)).filter((file) => file.endsWith('.md'))

  await Promise.all(snapshots.map((snapshot) => writeSnapshot(snapshot)))
  await Promise.all(files.map(async (file) => {
    const id = file.replace(/\.md$/, '')
    if (activeIds.has(id)) return
    await mkdir(path.join(trashDir, 'snapshots'), { recursive: true })
    await enqueueWrite(`snapshot:${id}`, () => (
      rename(path.join(snapshotsDir, file), path.join(trashDir, 'snapshots', `${id}-${Date.now()}.md`))
    ))
  }))
}
