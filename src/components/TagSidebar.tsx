import { useState } from 'react'
import { CheckCircle2, Sparkles, Tag, Plus, X } from 'lucide-react'
import { useBubbleStore } from '@/stores/bubbleStore'

const TAG_COLORS = [
  '#4f46e5', '#0891b2', '#7c3aed', '#e11d48',
  '#d97706', '#0f766e', '#64748b', '#db2777',
  '#2563eb', '#ea580c', '#65a30d', '#9333ea',
]

interface TagSidebarProps {
  onClose?: () => void
}

export default function TagSidebar({ onClose }: TagSidebarProps) {
  const { bubbles, filterTag, setFilterTag, updateBubble } = useBubbleStore()
  const [isAdding, setIsAdding] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])

  const tags = [...new Set(bubbles.map((b) => b.tag).filter(Boolean))]
  const tagCounts: Record<string, number> = {}
  bubbles.forEach((b) => {
    if (b.tag) tagCounts[b.tag] = (tagCounts[b.tag] || 0) + 1
  })

  const tagColors: Record<string, string> = {}
  bubbles.forEach((b) => {
    if (b.tag && b.color) tagColors[b.tag] = b.color
  })

  const handleAddTag = () => {
    if (!newTag.trim()) return
    const untagged = bubbles.filter((b) => !b.tag)
    if (untagged.length > 0) {
      updateBubble(untagged[0].id, { tag: newTag.trim(), color: newTagColor })
    }
    setNewTag('')
    setIsAdding(false)
  }

  return (
    <div className="h-full w-full glass-panel floating-window flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-outline-variant/30 flex items-center justify-between">
        <div className="flex items-center gap-2 text-on-surface">
          <Tag size={16} className="text-primary" />
          <span className="text-[15px] font-semibold">标签管理</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary-fixed/35 transition-all"
            title="添加标签"
          >
            <Plus size={14} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container/70 transition-all"
              title="关闭标签管理"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="px-4 py-3 border-b border-outline-variant/30 space-y-2 bg-white/24">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
            placeholder="新标签名..."
            className="w-full input-field text-xs !py-1.5 !px-2"
          />
          <div className="flex items-center gap-1 flex-wrap">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewTagColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-110 ${
                  newTagColor === c ? 'border-on-surface scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            onClick={handleAddTag}
            className="w-full text-[13px] font-semibold py-1.5 rounded-full bg-primary-fixed/50 text-primary hover:bg-primary-fixed transition-all"
          >
            添加标签
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-3">
        <button
          onClick={() => setFilterTag(null)}
          className={`w-full px-5 py-3 text-left text-[14px] font-semibold flex items-center gap-2 transition-all duration-300 ${
            filterTag === null
              ? 'text-primary bg-primary-fixed/40'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'
          }`}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-primary-fixed-dim to-primary" />
          <span>全部气泡</span>
          <span className="ml-auto text-outline">{bubbles.length}</span>
        </button>

        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => setFilterTag(filterTag === tag ? null : tag)}
            className={`w-full px-5 py-3 text-left text-[14px] font-semibold flex items-center gap-2 transition-all duration-300 ${
              filterTag === tag
                ? 'text-primary bg-primary-fixed/40'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'
            }`}
          >
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: tagColors[tag] || '#6f7973' }}
            />
            <span className="truncate">{tag}</span>
            <span className="ml-auto text-outline">{tagCounts[tag] || 0}</span>
          </button>
        ))}

        {bubbles.some((b) => !b.tag) && (
          <button
            onClick={() => setFilterTag(filterTag === '__untagged__' ? null : '__untagged__')}
            className={`w-full px-5 py-3 text-left text-[14px] font-semibold flex items-center gap-2 transition-all duration-300 ${
              filterTag === '__untagged__'
                ? 'text-tertiary bg-tertiary-fixed/30'
                : 'text-outline hover:text-on-surface-variant hover:bg-surface-container/50'
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-full border border-dashed border-outline-variant" />
            <span>未标签</span>
            <span className="ml-auto text-outline">
              {bubbles.filter((b) => !b.tag).length}
            </span>
          </button>
        )}
      </div>

      <div className="m-4 rounded-[24px] bg-white/42 p-4 ring-1 ring-white/60">
        <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-on-surface">
          <Sparkles size={14} className="text-primary" />
          工作线索
        </div>
        <div className="space-y-2 text-[13px] text-on-surface-variant">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-secondary" />
            <span>{bubbles.length} 个气泡已进入画布</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-secondary" />
            <span>{tags.length || 0} 个标签正在收束主题</span>
          </div>
        </div>
      </div>
    </div>
  )
}
