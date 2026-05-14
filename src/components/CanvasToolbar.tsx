import { Hand, MousePointer2, SquareDashedMousePointer, Target } from 'lucide-react'
import { useBubbleStore } from '@/stores/bubbleStore'

const modes = [
  { id: 'pan' as const, icon: Hand, label: '拖拽', shortcut: 'V' },
  { id: 'edit' as const, icon: MousePointer2, label: '编辑', shortcut: 'E' },
  { id: 'select' as const, icon: SquareDashedMousePointer, label: '选区', shortcut: 'S' },
]

export default function CanvasToolbar() {
  const { canvasMode, setCanvasMode, setViewport } = useBubbleStore()

  return (
    <div className="absolute top-5 left-5 z-30 glass-panel !rounded-full p-2 flex flex-col gap-1">
      {modes.map(({ id, icon: Icon, label, shortcut }) => (
        <button
          key={id}
          onClick={() => setCanvasMode(id)}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 relative group ${
            canvasMode === id
              ? 'bg-primary text-on-primary shadow-glow-primary'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60'
          }`}
          title={`${label} (${shortcut})`}
        >
          <Icon size={16} />
          <div className="absolute left-full ml-2 px-2 py-1 rounded-lg bg-inverse-surface text-inverse-on-surface text-[10px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {label} ({shortcut})
          </div>
        </button>
      ))}

      <div className="h-px bg-outline-variant/30 my-1 mx-1" />

      <button
        onClick={() => setViewport({ x: 0, y: 0, zoom: 1 })}
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60 relative group"
        title="重置视角"
      >
        <Target size={16} />
        <div className="absolute left-full ml-2 px-2 py-1 rounded-lg bg-inverse-surface text-inverse-on-surface text-[10px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          重置视角
        </div>
      </button>
    </div>
  )
}
