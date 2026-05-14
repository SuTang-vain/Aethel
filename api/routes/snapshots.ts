import { Router, type Request, type Response } from 'express'
import { moveSnapshotToTrash, writeSnapshot } from '../storage/snapshotFiles.js'
import { readWorkspace, writeWorkspace } from '../storage/workspaceFile.js'
import type { StoredSnapshot } from '../storage/types.js'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const workspace = await readWorkspace()
    res.json({ success: true, snapshots: workspace.snapshots })
  } catch (error: unknown) {
    console.error('Snapshot list error:', error)
    res.status(500).json({ success: false, error: (error as Error).message || 'Snapshot list error' })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const workspace = await readWorkspace()
    const snapshot = workspace.snapshots.find((item) => item.id === req.params.id)
    if (!snapshot) {
      res.status(404).json({ success: false, error: 'Snapshot not found' })
      return
    }
    res.json({ success: true, snapshot })
  } catch (error: unknown) {
    console.error('Snapshot read error:', error)
    res.status(500).json({ success: false, error: (error as Error).message || 'Snapshot read error' })
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const snapshot = req.body?.snapshot as StoredSnapshot | undefined
    if (!snapshot?.id || !snapshot.name) {
      res.status(400).json({ success: false, error: 'snapshot with id and name is required' })
      return
    }

    const workspace = await readWorkspace()
    const nextWorkspace = await writeWorkspace({
      ...workspace,
      snapshots: [snapshot, ...workspace.snapshots.filter((item) => item.id !== snapshot.id)],
    })

    res.status(201).json({ success: true, snapshot, workspace: nextWorkspace })
  } catch (error: unknown) {
    console.error('Snapshot create error:', error)
    res.status(500).json({ success: false, error: (error as Error).message || 'Snapshot create error' })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const workspace = await readWorkspace()
    const snapshot = workspace.snapshots.find((item) => item.id === req.params.id)
    if (!snapshot) {
      res.status(404).json({ success: false, error: 'Snapshot not found' })
      return
    }

    const updatedSnapshot = { ...snapshot, ...req.body, id: snapshot.id } as StoredSnapshot
    await writeSnapshot(updatedSnapshot)
    const nextWorkspace = await writeWorkspace({
      ...workspace,
      snapshots: workspace.snapshots.map((item) => item.id === snapshot.id ? updatedSnapshot : item),
    })

    res.json({ success: true, snapshot: updatedSnapshot, workspace: nextWorkspace })
  } catch (error: unknown) {
    console.error('Snapshot update error:', error)
    res.status(500).json({ success: false, error: (error as Error).message || 'Snapshot update error' })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const workspace = await readWorkspace()
    await moveSnapshotToTrash(req.params.id)
    const nextWorkspace = await writeWorkspace({
      ...workspace,
      snapshots: workspace.snapshots.filter((snapshot) => snapshot.id !== req.params.id),
    })

    res.json({ success: true, workspace: nextWorkspace })
  } catch (error: unknown) {
    console.error('Snapshot delete error:', error)
    res.status(500).json({ success: false, error: (error as Error).message || 'Snapshot delete error' })
  }
})

export default router
