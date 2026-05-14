import { mkdir, rename, writeFile } from 'fs/promises'
import path from 'path'

export async function atomicWriteFile(targetPath: string, content: string) {
  const dir = path.dirname(targetPath)
  await mkdir(dir, { recursive: true })
  const tempPath = path.join(
    dir,
    `.${path.basename(targetPath)}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`,
  )

  try {
    await writeFile(tempPath, content, 'utf8')
    await rename(tempPath, targetPath)
  } catch (err) {
    console.error(`Atomic write failed to ${targetPath}:`, err)
    throw err
  }
}
