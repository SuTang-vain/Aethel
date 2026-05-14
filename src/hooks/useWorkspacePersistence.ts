import { useEffect, useRef } from 'react'
import { useBubbleStore } from '@/stores/bubbleStore'
import { usePersistenceStore } from '@/stores/persistenceStore'
import { useSnapshotStore } from '@/stores/snapshotStore'

type PersistedWorkspace = {
  bubbles: ReturnType<typeof useBubbleStore.getState>['bubbles']
  categories: ReturnType<typeof useBubbleStore.getState>['categories']
  relations: ReturnType<typeof useBubbleStore.getState>['relations']
  extensions: ReturnType<typeof useBubbleStore.getState>['extensions']
  revisions: ReturnType<typeof useBubbleStore.getState>['revisions']
  snapshots: ReturnType<typeof useSnapshotStore.getState>['snapshots']
  viewport: ReturnType<typeof useBubbleStore.getState>['viewport']
  filterTag: ReturnType<typeof useBubbleStore.getState>['filterTag']
  canvasMode: ReturnType<typeof useBubbleStore.getState>['canvasMode']
}

function collectWorkspace(): PersistedWorkspace {
  const bubbleState = useBubbleStore.getState()
  const snapshotState = useSnapshotStore.getState()

  return {
    bubbles: bubbleState.bubbles,
    categories: bubbleState.categories,
    relations: bubbleState.relations,
    extensions: bubbleState.extensions,
    revisions: bubbleState.revisions,
    snapshots: snapshotState.snapshots,
    viewport: bubbleState.viewport,
    filterTag: bubbleState.filterTag,
    canvasMode: bubbleState.canvasMode,
  }
}

function hasServerWorkspace(workspace: PersistedWorkspace) {
  return (
    workspace.bubbles.length > 0
    || workspace.snapshots.length > 0
    || workspace.categories.length > 0
    || workspace.relations.length > 0
    || workspace.extensions.length > 0
    || (workspace.revisions || []).length > 0
  )
}

export function useWorkspacePersistence() {
  const loadedRef = useRef(false)
  const applyingRemoteRef = useRef(false)
  const writeTimerRef = useRef<number | null>(null)
  const latestWorkspaceRef = useRef<PersistedWorkspace>(collectWorkspace())
  const lastSavedSignatureRef = useRef('')
  const pendingSignatureRef = useRef('')

  useEffect(() => {
    let cancelled = false

    const writeWorkspace = async (workspace: PersistedWorkspace) => {
      const signature = JSON.stringify(workspace)
      if (signature === lastSavedSignatureRef.current || signature === pendingSignatureRef.current) {
        return
      }

      pendingSignatureRef.current = signature
      usePersistenceStore.getState().setSaving()
      try {
        const response = await fetch('/api/workspace', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspace }),
        })
        if (!response.ok) throw new Error('workspace save failed')
        lastSavedSignatureRef.current = signature
        usePersistenceStore.getState().setSaved()
      } catch {
        usePersistenceStore.getState().setError('文件层保存失败，当前更改已保留在浏览器缓存中。')
        // Keep localStorage as the immediate fallback. The next change will retry.
      } finally {
        if (pendingSignatureRef.current === signature) {
          pendingSignatureRef.current = ''
        }
      }
    }

    const scheduleWrite = () => {
      if (!loadedRef.current || applyingRemoteRef.current) return
      latestWorkspaceRef.current = collectWorkspace()
      const signature = JSON.stringify(latestWorkspaceRef.current)
      if (signature === lastSavedSignatureRef.current || signature === pendingSignatureRef.current) return

      if (writeTimerRef.current) {
        window.clearTimeout(writeTimerRef.current)
      }
      writeTimerRef.current = window.setTimeout(() => {
        writeWorkspace(latestWorkspaceRef.current)
      }, 800)
    }

    const unsubscribeBubbleStore = useBubbleStore.subscribe(scheduleWrite)
    const unsubscribeSnapshotStore = useSnapshotStore.subscribe(scheduleWrite)

    const loadWorkspace = async () => {
      usePersistenceStore.getState().setLoading()
      try {
        const response = await fetch('/api/workspace')
        if (!response.ok) throw new Error('workspace request failed')
        const data = await response.json()
        const workspace = data.workspace as PersistedWorkspace | undefined
        if (!workspace || cancelled) return

        if (hasServerWorkspace(workspace)) {
          applyingRemoteRef.current = true
          useBubbleStore.setState({
            bubbles: workspace.bubbles || [],
            categories: workspace.categories || [],
            relations: workspace.relations || [],
            extensions: workspace.extensions || [],
            revisions: workspace.revisions || [],
            viewport: workspace.viewport || { x: 0, y: 0, zoom: 1 },
            filterTag: workspace.filterTag || null,
            canvasMode: workspace.canvasMode || 'pan',
          })
          useSnapshotStore.setState({
            snapshots: workspace.snapshots || [],
          })
          applyingRemoteRef.current = false
          lastSavedSignatureRef.current = JSON.stringify(collectWorkspace())
          usePersistenceStore.getState().setSaved()
        } else {
          latestWorkspaceRef.current = collectWorkspace()
          if (hasServerWorkspace(latestWorkspaceRef.current)) {
            await writeWorkspace(latestWorkspaceRef.current)
          } else {
            lastSavedSignatureRef.current = JSON.stringify(latestWorkspaceRef.current)
            usePersistenceStore.getState().setSaved()
          }
        }
      } catch {
        usePersistenceStore.getState().setError('文件层暂不可用，正在使用浏览器缓存。')
        // The app remains usable through Zustand localStorage when the file API is unavailable.
      } finally {
        loadedRef.current = true
      }
    }

    loadWorkspace()

    return () => {
      cancelled = true
      unsubscribeBubbleStore()
      unsubscribeSnapshotStore()
      if (writeTimerRef.current) {
        window.clearTimeout(writeTimerRef.current)
      }
    }
  }, [])
}
