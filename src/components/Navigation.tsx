import { useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Check, Hand, MousePointer2, SquareDashedMousePointer, Target, Trash2, X } from 'lucide-react'
import { useBubbleStore } from '@/stores/bubbleStore'

const toolItems = [
  { id: 'pan' as const, icon: Hand, label: '拖拽', shortcut: 'V' },
  { id: 'edit' as const, icon: MousePointer2, label: '编辑', shortcut: 'E' },
  { id: 'select' as const, icon: SquareDashedMousePointer, label: '选区', shortcut: 'S' },
]

export default function Navigation() {
  const location = useLocation()
  const {
    canvasMode,
    setCanvasMode,
    setViewport,
    selectedBubbleIds,
    activeBubbleId,
    deleteBubble,
    clearSelectedBubbles,
  } = useBubbleStore()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const selectedIds = selectedBubbleIds.length > 0
    ? selectedBubbleIds
    : activeBubbleId
      ? [activeBubbleId]
      : []
  const canDelete = selectedIds.length > 0

  useEffect(() => {
    if (!canDelete) setConfirmDelete(false)
  }, [canDelete])

  if (location.pathname !== '/') return null

  const handleDelete = () => {
    if (!canDelete) return
    selectedIds.forEach((id) => deleteBubble(id))
    clearSelectedBubbles()
    setConfirmDelete(false)
  }

  return (
    <nav className="fixed left-1/2 top-5 z-50 -translate-x-1/2 glass-panel floating-window !rounded-full p-1">
      <div className="flex items-center gap-1">
        {toolItems.map(({ id, icon: Icon, label, shortcut }) => (
          <button
            key={id}
            onClick={() => setCanvasMode(id)}
            className={`h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300 relative group ${
              canvasMode === id
                ? 'bg-primary text-on-primary shadow-glow-primary'
                : 'text-on-surface-variant hover:text-primary hover:bg-primary-fixed/40'
            }`}
            title={`${label} (${shortcut})`}
          >
            <Icon size={15} />
            <span className="absolute top-full mt-3 px-2 py-1 rounded-lg bg-inverse-surface text-inverse-on-surface text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {label} ({shortcut})
            </span>
          </button>
        ))}
        <span className="mx-0.5 h-4 w-px bg-white/45" />
        {confirmDelete ? (
          <div className="flex items-center gap-1 rounded-full bg-error-container/70 p-0.5">
            <button
              onClick={handleDelete}
              className="h-7 rounded-full px-2.5 flex items-center gap-1 text-[11px] font-semibold text-on-error-container hover:bg-white/55 transition-all"
              title={`确认删除 ${selectedIds.length} 个气泡`}
            >
              <Check size={13} />
              删除
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="h-7 w-7 rounded-full flex items-center justify-center text-on-error-container/75 hover:bg-white/55 hover:text-on-error-container transition-all"
              title="取消删除"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => canDelete && setConfirmDelete(true)}
            disabled={!canDelete}
            className="h-8 w-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container/55 transition-all relative group disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:text-on-surface-variant disabled:hover:bg-transparent"
            title={canDelete ? `删除所选气泡 (${selectedIds.length})` : '先选择气泡'}
          >
            <Trash2 size={15} />
            <span className="absolute top-full mt-3 px-2 py-1 rounded-lg bg-inverse-surface text-inverse-on-surface text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {canDelete ? `删除所选 (${selectedIds.length})` : '先选择气泡'}
            </span>
          </button>
        )}
        <span className="mx-0.5 h-4 w-px bg-white/45" />
        <button
          onClick={() => setViewport({ x: 0, y: 0, zoom: 1 })}
          className="h-8 w-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary-fixed/40 transition-all relative group"
          title="重置视角"
        >
          <Target size={15} />
          <span className="absolute top-full mt-3 px-2 py-1 rounded-lg bg-inverse-surface text-inverse-on-surface text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            重置视角
          </span>
        </button>
      </div>
    </nav>
  )
}
