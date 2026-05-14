import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const projectRoot = path.resolve(__dirname, '../..')
export const dataDir = process.env.AETHEL_DATA_DIR
  ? path.resolve(process.env.AETHEL_DATA_DIR)
  : path.join(projectRoot, 'data')
export const bubblesDir = path.join(dataDir, 'bubbles')
export const snapshotsDir = path.join(dataDir, 'snapshots')
export const trashDir = path.join(dataDir, '.trash')
export const workspaceFilePath = path.join(dataDir, 'workspace.json')

export function safeId(id: string) {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_')
}
