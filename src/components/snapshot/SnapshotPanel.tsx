import { useEffect, useMemo, useState } from 'react'
import { Brain, Camera, Check, Loader2, Plus, Sparkles, X } from 'lucide-react'
import SnapshotCard from '@/components/snapshot/SnapshotCard'
import { requestSnapshotCognition, SNAPSHOT_BACKEND_ERROR_MESSAGE } from '@/lib/snapshotCognition'
import { useAiStore } from '@/stores/aiStore'
import { useBubbleStore } from '@/stores/bubbleStore'
import { useSnapshotStore } from '@/stores/snapshotStore'

interface SnapshotPanelProps {
  onClose?: () => void
  embedded?: boolean
  contained?: boolean
  selectedBubbleIds?: string[]
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SnapshotPanel({ onClose, embedded = false, contained = false, selectedBubbleIds = [] }: SnapshotPanelProps) {
  const { bubbles, categories, viewport, extensions, relations, filterTag } = useBubbleStore()
  const { snapshots, createSnapshot, restoreSnapshot, deleteSnapshot } = useSnapshotStore()
  const setGlobalAiActivity = useAiStore((state) => state.setGlobalAiActivity)
  const [snapshotName, setSnapshotName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isArchitecting, setIsArchitecting] = useState(false)
  const [expandedSnapshotId, setExpandedSnapshotId] = useState<string | null>(null)
  const [deepSnapshotId, setDeepSnapshotId] = useState<string | null>(null)
  const [includedBubbleIds, setIncludedBubbleIds] = useState<Set<string>>(() => new Set())

  const visibleBubbles = useMemo(() => {
    if (filterTag === '__untagged__') return bubbles.filter((bubble) => !bubble.tag)
    if (filterTag) return bubbles.filter((bubble) => bubble.tag === filterTag)
    return bubbles
  }, [bubbles, filterTag])

  const selectedBubbles = visibleBubbles.filter((bubble) => includedBubbleIds.has(bubble.id))
  const recentSnapshots = embedded ? snapshots.slice(0, 4) : snapshots
  const selectedBubbleIdsSignature = selectedBubbleIds.join('|')

  useEffect(() => {
    if (selectedBubbleIds.length === 0) return

    const visibleIds = new Set(visibleBubbles.map((bubble) => bubble.id))
    const nextIncluded = selectedBubbleIds.filter((id) => visibleIds.has(id))
    if (nextIncluded.length === 0) return

    setIncludedBubbleIds(new Set(nextIncluded))
    setIsCreating(true)
  }, [selectedBubbleIds, selectedBubbleIdsSignature, visibleBubbles])

  const openCreator = () => {
    const nextOpen = !isCreating
    setIsCreating(nextOpen)
    if (nextOpen && includedBubbleIds.size === 0) {
      setIncludedBubbleIds(new Set(selectedBubbleIds.length > 0 ? selectedBubbleIds : visibleBubbles.map((bubble) => bubble.id)))
    }
  }

  const toggleBubble = (id: string) => {
    setIncludedBubbleIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setIncludedBubbleIds((prev) => (
      prev.size === visibleBubbles.length ? new Set() : new Set(visibleBubbles.map((bubble) => bubble.id))
    ))
  }

  const handleCreateSnapshot = async () => {
    if (selectedBubbles.length === 0 || isArchitecting) return
    setIsArchitecting(true)
    setGlobalAiActivity(true, '正在生成认知快照')

    try {
      const selectedBubbleIdsList = selectedBubbles.map((bubble) => bubble.id)
      const selectedRelations = relations.filter(
        (relation) => selectedBubbleIdsList.includes(relation.sourceId) && selectedBubbleIdsList.includes(relation.targetId),
      )
      const selectedExtensions = extensions.filter((extension) => selectedBubbleIdsList.includes(extension.bubbleId))
      const cognitionResult = await requestSnapshotCognition(selectedBubbles, selectedExtensions, categories)
      const name = snapshotName.trim() || `快照 ${snapshots.length + 1}`

      createSnapshot(name, selectedBubbles, viewport, categories, cognitionResult.cognition, selectedRelations, selectedExtensions)

      setSnapshotName('')
      setIsCreating(false)
      setIncludedBubbleIds(new Set())
      useAiStore.setState({ error: null })
    } catch {
      setSnapshotName('')
      setIsCreating(false)
      setIncludedBubbleIds(new Set())
      useAiStore.setState({ error: SNAPSHOT_BACKEND_ERROR_MESSAGE })
    } finally {
      setIsArchitecting(false)
      setGlobalAiActivity(false)
    }
  }

  const handleRestore = (id: string) => {
    const snapshot = restoreSnapshot(id)
    if (!snapshot) return

    useBubbleStore.setState({
      bubbles: snapshot.canvasState.bubbles,
      categories: snapshot.tagState.categories,
      relations: snapshot.canvasState.relations || [],
      extensions: snapshot.canvasState.extensions || [],
      viewport: snapshot.canvasState.viewport,
    })
  }

  return (
    <div className={embedded
      ? contained
        ? 'h-full w-full glass-panel floating-window bg-surface/80 p-4 flex flex-col overflow-hidden'
        : 'absolute top-4 right-4 bottom-4 z-40 w-[360px] glass-panel bg-surface/80 p-4 flex flex-col'
      : 'space-y-6'
    }>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-primary" />
          <div>
            <div className="text-[13px] text-on-surface font-semibold tracking-wider">认知快照</div>
            <div className="text-[11px] text-outline">
              {snapshots.length} 个快照 · {visibleBubbles.length} 个可见气泡
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={openCreator}
            className="w-8 h-8 rounded-full flex items-center justify-center text-primary hover:bg-primary-container/20 transition-all"
            title="新建快照"
          >
            <Plus size={15} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container/60 transition-all"
              title="关闭"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {isCreating && (
        <div className="rounded-[26px] bg-white/35 border border-outline-variant/20 p-3 space-y-3 animate-bubble-in">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateSnapshot()}
              placeholder="快照名称..."
              className="min-w-0 flex-1 input-field text-[13px] !py-2.5"
            />
            <button
              onClick={handleCreateSnapshot}
              disabled={isArchitecting || selectedBubbles.length === 0}
              className="btn-liquid flex h-11 w-[76px] shrink-0 items-center justify-center gap-1 !px-0 !py-0 text-[13px] whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isArchitecting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              保存
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-on-surface-variant font-semibold tracking-wider">
              纳入快照的气泡
            </span>
            <button onClick={toggleAll} className="text-[11px] text-primary font-semibold">
              {includedBubbleIds.size === visibleBubbles.length ? '清空' : '全选'}
            </button>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1">
            {visibleBubbles.length === 0 ? (
              <div className="text-[12px] text-outline text-center py-4">暂无可选气泡</div>
            ) : (
              visibleBubbles.map((bubble) => (
                <button
                  key={bubble.id}
                  onClick={() => toggleBubble(bubble.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-xl flex items-start gap-2 transition-all ${
                    includedBubbleIds.has(bubble.id)
                      ? 'bg-primary-container/20 text-primary'
                      : 'hover:bg-surface-container/60 text-on-surface-variant'
                  }`}
                  data-testid={includedBubbleIds.has(bubble.id) ? 'snapshot-bubble-included' : 'snapshot-bubble-excluded'}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                    includedBubbleIds.has(bubble.id) ? 'border-primary bg-primary/15' : 'border-outline-variant'
                  }`}>
                    {includedBubbleIds.has(bubble.id) && <Check size={10} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] truncate">{bubble.content}</div>
                    <div className="text-[10px] text-outline mt-0.5">
                      权重 {bubble.interactionWeight || 0}{bubble.tag ? ` · ${bubble.tag}` : ''}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <div className={embedded ? 'flex-1 overflow-y-auto space-y-3 pr-1' : 'space-y-4'}>
        {recentSnapshots.length === 0 ? (
          <div className="text-center py-10">
            <Camera size={34} className="text-outline-variant mx-auto mb-3" />
            <div className="text-[13px] text-on-surface-variant">暂无快照</div>
            <div className="text-[11px] text-outline mt-1">从当前气泡工作区创建一个语义快照</div>
          </div>
        ) : (
          recentSnapshots.map((snapshot) => (
            <SnapshotCard
              key={snapshot.id}
              snapshot={snapshot}
              expanded={expandedSnapshotId === snapshot.id}
              deep={deepSnapshotId === snapshot.id}
              onToggleExpand={() => setExpandedSnapshotId(expandedSnapshotId === snapshot.id ? null : snapshot.id)}
              onToggleDeep={() => setDeepSnapshotId(deepSnapshotId === snapshot.id ? null : snapshot.id)}
              onRestore={() => handleRestore(snapshot.id)}
              onDelete={() => deleteSnapshot(snapshot.id)}
              formatTime={formatTime}
              compact={embedded}
            />
          ))
        )}
      </div>
    </div>
  )
}
