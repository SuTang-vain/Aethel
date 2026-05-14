import { ChevronDown, ChevronUp, RotateCcw, Trash2 } from 'lucide-react'
import SnapshotLevelDisclosure from '@/components/snapshot/SnapshotLevelDisclosure'
import type { Snapshot } from '@/stores/snapshotStore'

interface SnapshotCardProps {
  snapshot: Snapshot
  expanded: boolean
  deep: boolean
  onToggleExpand: () => void
  onToggleDeep: () => void
  onRestore: () => void
  onDelete?: () => void
  formatTime: (iso: string) => string
  compact?: boolean
}

export default function SnapshotCard({
  snapshot,
  expanded,
  deep,
  onToggleExpand,
  onToggleDeep,
  onRestore,
  onDelete,
  formatTime,
  compact = false,
}: SnapshotCardProps) {
  if (compact) {
    return (
      <div className="surface-list-card group relative overflow-hidden rounded-[26px] p-3.5 transition-all">
        <div className="absolute right-2.5 top-2.5 flex items-center gap-0.5">
          <button
            onClick={onRestore}
            className="flex h-7 w-7 items-center justify-center rounded-full text-primary/70 transition-all hover:bg-primary-fixed/45 hover:text-primary"
            title="恢复快照"
          >
            <RotateCcw size={13} />
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex h-7 w-7 items-center justify-center rounded-full text-error/45 transition-all hover:bg-error-container/35 hover:text-error"
              title="删除快照"
            >
              <Trash2 size={13} />
            </button>
          )}
          <button
            onClick={onToggleExpand}
            className="flex h-7 w-7 items-center justify-center rounded-full text-on-surface-variant transition-all hover:bg-white/55 hover:text-on-surface"
            title={expanded ? '收起' : '展开'}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>

        <button onClick={onToggleExpand} className="block w-full pr-20 text-left">
          <div className="truncate text-[15px] font-semibold leading-5 text-on-surface">{snapshot.name}</div>
          <div className="mt-1 font-mono text-[11px] text-outline">{formatTime(snapshot.createdAt)}</div>
        </button>

        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-full bg-primary-fixed/70 px-2.5 py-1 text-[11px] font-semibold text-primary">
            Level 1
          </span>
          <span className="h-px flex-1 bg-outline-variant/20" />
        </div>

        <SnapshotLevelDisclosure
          snapshot={snapshot}
          expanded={expanded}
          deep={deep}
          onToggleExpand={onToggleExpand}
          onToggleDeep={onToggleDeep}
          formatTime={formatTime}
          compact
        />
      </div>
    )
  }

  return (
    <div className="surface-list-card overflow-hidden rounded-[26px] p-4 transition-all group">
      <div className="flex items-start justify-between gap-4">
        <button onClick={onToggleExpand} className="flex-1 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] text-on-surface font-medium">{snapshot.name}</span>
            <span className="text-[11px] text-outline font-mono">{formatTime(snapshot.createdAt)}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-container/20 text-primary">
              Level 1
            </span>
          </div>

        </button>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onRestore}
            className="w-8 h-8 rounded-full flex items-center justify-center text-primary/60 hover:text-primary hover:bg-primary-container/20 transition-all"
            title="恢复快照"
          >
            <RotateCcw size={14} />
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              className="w-8 h-8 rounded-full flex items-center justify-center text-error/40 hover:text-error hover:bg-error-container/20 transition-all"
              title="删除快照"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            onClick={onToggleExpand}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60 transition-all"
            title={expanded ? '收起' : '展开'}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      <SnapshotLevelDisclosure
        snapshot={snapshot}
        expanded={expanded}
        deep={deep}
        onToggleExpand={onToggleExpand}
        onToggleDeep={onToggleDeep}
        formatTime={formatTime}
      />
    </div>
  )
}
