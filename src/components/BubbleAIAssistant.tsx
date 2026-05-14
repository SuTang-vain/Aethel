import { useMemo, useState } from 'react'
import { Loader2, MessageCircle, Pencil, Plus, Send, Sparkles, X } from 'lucide-react'
import FollowUpDialog from '@/components/FollowUpDialog'
import { useAiStore } from '@/stores/aiStore'
import { useBubbleStore } from '@/stores/bubbleStore'

type AssistantMode = 'add' | 'rewrite' | 'extend' | 'followup'

interface BubbleAIAssistantProps {
  onRemoveSelectedBubble?: (id: string) => void
  onClearSelectedBubbles?: () => void
}

const modes: Array<{
  id: AssistantMode
  label: string
  icon: typeof Pencil
  placeholder: string
}> = [
  {
    id: 'add',
    label: '添加气泡',
    icon: Plus,
    placeholder: '输入灵感，回车生成气泡...',
  },
  {
    id: 'rewrite',
    label: '改写内容',
    icon: Pencil,
    placeholder: '输入新的气泡内容，或写下你希望它变成什么表达...',
  },
  {
    id: 'extend',
    label: '追加补充',
    icon: Plus,
    placeholder: '补充约束、场景、用户、判断标准，作为这条气泡的追问沉淀...',
  },
  {
    id: 'followup',
    label: '继续追问',
    icon: MessageCircle,
    placeholder: '告诉 AI 你想追问的方向，例如“围绕目标用户继续问”...',
  },
]

export default function BubbleAIAssistant({
  onRemoveSelectedBubble,
  onClearSelectedBubbles,
}: BubbleAIAssistantProps) {
  const {
    bubbles,
    relations,
    activeBubbleId,
    selectedBubbleIds,
    setActiveBubble,
    addBubble,
    updateBubble,
    addExtension,
  } = useBubbleStore()
  const { followUp, isLoading, clearFollowUp } = useAiStore()
  const [mode, setMode] = useState<AssistantMode>('rewrite')
  const [instruction, setInstruction] = useState('')

  const selectedBubble = useMemo(
    () => bubbles.find((item) => item.id === activeBubbleId),
    [bubbles, activeBubbleId],
  )
  const selectedBubbles = useMemo(
    () => selectedBubbleIds
      .map((id) => bubbles.find((item) => item.id === id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [bubbles, selectedBubbleIds],
  )
  const bubble = selectedBubble || (selectedBubbles.length === 1 ? selectedBubbles[0] : undefined)
  const contextLabel = selectedBubbles.length > 1
    ? `已选 ${selectedBubbles.length} 个气泡`
    : bubble
      ? `正在处理：${bubble.content}`
      : '捕捉新的产品构思'
  const hasSelectedBubbles = selectedBubbles.length > 0
  const isMultiBubbleContext = selectedBubbles.length >= 2

  const availableModes = isMultiBubbleContext
    ? modes.filter((item) => item.id === 'followup')
    : bubble
      ? modes.filter((item) => item.id !== 'add')
      : modes.filter((item) => item.id === 'add')
  const normalizedMode = isMultiBubbleContext ? 'followup' : bubble && mode === 'add' ? 'rewrite' : !bubble ? 'add' : mode
  const activeMode = modes.find((item) => item.id === normalizedMode) || modes[0]
  const placeholder = isMultiBubbleContext
    ? '追问这些气泡之间的关系、冲突、依赖或下一步判断...'
    : activeMode.placeholder
  const canSubmit = instruction.trim().length > 0 || ((bubble || isMultiBubbleContext) && normalizedMode === 'followup')

  const handleSubmit = async () => {
    const value = instruction.trim()

    if (normalizedMode === 'add') {
      if (!value) return
      const id = addBubble(value)
      setActiveBubble(id)
      useAiStore.setState({ activeFollowUpBubbleId: id, activeFollowUpBubbleIds: [id] })
      await followUp(value, bubbles.map((item) => item.content))
      setInstruction('')
      return
    }

    if (isMultiBubbleContext) {
      const selectedIdSet = new Set(selectedBubbles.map((item) => item.id))
      const selectedRelations = relations.filter((relation) => (
        selectedIdSet.has(relation.sourceId) && selectedIdSet.has(relation.targetId)
      ))
      const bubbleContext = selectedBubbles
        .map((item, index) => [
          `气泡 ${index + 1}`,
          `ID: ${item.id}`,
          `内容: ${item.content}`,
          item.tag ? `标签: ${item.tag}` : '',
        ].filter(Boolean).join('\n'))
        .join('\n')
      const relationContext = selectedRelations.length > 0
        ? selectedRelations
          .map((relation) => {
            const source = selectedBubbles.find((item) => item.id === relation.sourceId)?.content || relation.sourceId
            const target = selectedBubbles.find((item) => item.id === relation.targetId)?.content || relation.targetId
            return `- ${relation.type}:「${source}」↔「${target}」，原因：${relation.reason}`
          })
          .join('\n')
        : '暂无显式关系线，请先根据内容判断它们的潜在关系。'
      const context = [
        '请围绕以下多个产品构思气泡之间的关系继续追问，而不是只追问其中某一个气泡。',
        '',
        '所选气泡：',
        bubbleContext,
        '',
        '已有关系：',
        relationContext,
        '',
        value ? `用户希望追问的方向：${value}` : '请优先追问它们之间的依赖、冲突、重复、合并路径或关键验证问题。',
      ].join('\n')

      useAiStore.setState({
        activeFollowUpBubbleId: selectedBubbles[0]?.id || null,
        activeFollowUpBubbleIds: selectedBubbles.map((item) => item.id),
      })
      await followUp(
        context,
        bubbles.map((item) => `ID: ${item.id}\n内容: ${item.content}${item.tag ? `\n标签: ${item.tag}` : ''}`),
        { mode: 'relationship', targetBubbleIds: selectedBubbles.map((item) => item.id) },
      )
      setInstruction('')
      return
    }

    if (!bubble) return

    if (normalizedMode === 'rewrite') {
      if (!value) return
      updateBubble(bubble.id, { content: value })
      setInstruction('')
      return
    }

    if (normalizedMode === 'extend') {
      if (!value) return
      addExtension(bubble.id, value, 'manual')
      setInstruction('')
      return
    }

    const context = value
      ? `${bubble.content}\n\n用户希望继续追问的方向：${value}`
      : bubble.content
    useAiStore.setState({ activeFollowUpBubbleId: bubble.id, activeFollowUpBubbleIds: [bubble.id] })
    await followUp(context, bubbles.map((item) => item.content))
    setInstruction('')
  }

  return (
    <div className="absolute left-1/2 bottom-5 z-50 w-[min(640px,calc(100%-48px))] -translate-x-1/2">
      <div className="glass-panel !rounded-[30px] p-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Sparkles size={15} className="text-primary" />
                <span className="min-w-[92px] max-w-[260px] shrink truncate text-[13px] font-semibold text-on-surface">
                  {contextLabel}
                </span>
                {hasSelectedBubbles && (
                  <div className="relative min-w-0 flex-1">
                    <div className="selected-bubble-strip scrollbar-none flex items-center gap-1 overflow-x-auto px-3">
                      {selectedBubbles.map((item) => (
                        <div
                          key={item.id}
                          className="flex h-6 max-w-[138px] shrink-0 items-center gap-1 rounded-full border px-1.5 text-left transition-colors hover:shadow-glass"
                          style={{
                            backgroundColor: `${item.color || '#94a3b8'}1f`,
                            borderColor: `${item.color || '#94a3b8'}55`,
                          }}
                          title={item.content}
                        >
                          <button
                            type="button"
                            onClick={() => setActiveBubble(item.id, { includeInSelection: false })}
                            className="flex min-w-0 flex-1 items-center gap-1 text-left"
                          >
                            <span
                              className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white/70"
                              style={{ backgroundColor: item.color || '#94a3b8' }}
                            />
                            <span className="min-w-0 truncate text-[10px] font-semibold leading-none text-on-surface">
                              {item.content}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              onRemoveSelectedBubble?.(item.id)
                            }}
                            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-on-surface-variant/65 transition-all hover:bg-white/70 hover:text-primary"
                            title="移出选区"
                            data-testid="selected-bubble-chip-remove"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {(bubble || hasSelectedBubbles) && (
                <button
                  onClick={() => {
                    if (hasSelectedBubbles) {
                      clearFollowUp()
                      onClearSelectedBubbles?.()
                      return
                    }
                    clearFollowUp()
                    setActiveBubble(null)
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-outline hover:bg-surface-container/70 hover:text-on-surface"
                  title={hasSelectedBubbles ? '清空全部选中气泡' : '关闭气泡 AI 输入'}
                  data-testid={hasSelectedBubbles ? 'clear-selected-bubbles' : 'close-bubble-ai'}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <FollowUpDialog />

            <div className="flex flex-col gap-2 md:flex-row">
              {(availableModes.length > 1 || isMultiBubbleContext) && (
                <div className="flex shrink-0 rounded-full bg-white/50 p-1 ring-1 ring-outline-variant/30">
                  {availableModes.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setMode(id)}
                      className={`flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-semibold transition-all ${
                        normalizedMode === id
                          ? 'bg-primary text-on-primary shadow-glow-primary'
                          : 'text-on-surface-variant hover:bg-white/70 hover:text-on-surface'
                      }`}
                      title={label}
                    >
                      <Icon size={13} />
                      {label}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative flex-1">
                <input
                  value={instruction}
                  onChange={(event) => setInstruction(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleSubmit()
                  }}
                  placeholder={placeholder}
                  className="input-field h-12 w-full pr-[92px] text-[13px]"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || isLoading}
                  className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-on-primary transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
                  title={normalizedMode === 'add' ? '发送' : activeMode.label}
                >
                  {isLoading && (normalizedMode === 'followup' || normalizedMode === 'add') ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
