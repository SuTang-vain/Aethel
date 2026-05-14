import { Loader2, MessageCircle } from 'lucide-react'
import { useAiStore } from '@/stores/aiStore'
import type { FollowUpOption } from '@/stores/aiStore'
import { useBubbleStore } from '@/stores/bubbleStore'

export default function FollowUpDialog() {
  const { followUpResult, activeFollowUpBubbleId, activeFollowUpBubbleIds, isLoading, clearFollowUp } = useAiStore()
  const { bubbles, addExtension, updateBubble, deleteBubble, selectBubble, relations, removeRelation } = useBubbleStore()

  const targetBubbleIds = activeFollowUpBubbleIds.length > 0
    ? activeFollowUpBubbleIds
    : activeFollowUpBubbleId
      ? [activeFollowUpBubbleId]
      : []

  if (targetBubbleIds.length === 0) return null

  const panelTitle = isLoading || !followUpResult
    ? '小壳正在思考中...'
    : targetBubbleIds.length > 1
      ? 'AI 关系建议'
      : 'AI 智能追问'

  const existingBubbleIds = new Set(bubbles.map((bubble) => bubble.id))

  const resolveBubbleId = (rawId?: string) => {
    const id = rawId?.trim()
    if (!id) return null
    if (existingBubbleIds.has(id)) return id

    const embeddedId = bubbles.find((bubble) => id.includes(bubble.id))?.id
    if (embeddedId) return embeddedId

    const indexMatch = id.match(/(?:气泡|bubble)?\s*#?\s*(\d+)/i)
    if (indexMatch) {
      const index = Number(indexMatch[1]) - 1
      const indexedId = targetBubbleIds[index]
      return indexedId && existingBubbleIds.has(indexedId) ? indexedId : null
    }

    return null
  }

  const resolveBubbleIds = (ids?: string[]) => {
    return Array.from(new Set((ids || [])
      .map((id) => resolveBubbleId(id))
      .filter((id): id is string => Boolean(id))))
  }

  const removeResolvedRelations = (bubbleIds: string[]) => {
    const resolvedIds = new Set(bubbleIds)
    relations
      .filter((relation) => (
        (relation.type === 'contradictory' || relation.type === 'duplicate')
        && resolvedIds.has(relation.sourceId)
        && resolvedIds.has(relation.targetId)
      ))
      .forEach((relation) => removeRelation(relation.id))
  }

  const handleSelect = (option: FollowUpOption) => {
    if (option.text === '就这样吧') {
      clearFollowUp()
      return
    }

    const resolvedOptionTargets = resolveBubbleIds(option.targetBubbleIds?.length
      ? option.targetBubbleIds
      : targetBubbleIds)
    const action = option.action || (option.text.includes('合并') && option.newContent?.trim() ? 'merge' : undefined)

    if (action === 'merge') {
      const targetId = resolveBubbleId(option.targetBubbleId)
        || resolvedOptionTargets[0]
        || targetBubbleIds.find((id) => existingBubbleIds.has(id))
        || null
      const mergedContent = option.newContent?.trim()
      const sourceIds = resolveBubbleIds(option.sourceBubbleIds)
      const explicitDeleteIds = resolveBubbleIds(option.deleteBubbleIds)
      const fallbackAbsorbedIds = resolvedOptionTargets.length > 1 ? resolvedOptionTargets : targetBubbleIds
      const deleteIds = Array.from(new Set([
        ...explicitDeleteIds,
        ...sourceIds,
        ...fallbackAbsorbedIds,
      ])).filter((id) => id !== targetId && existingBubbleIds.has(id))

      if (targetId && mergedContent) {
        updateBubble(targetId, { content: mergedContent })
        const involvedIds = Array.from(new Set([
          targetId,
          ...deleteIds,
          ...targetBubbleIds,
        ]))
        removeResolvedRelations(involvedIds)
        deleteIds.forEach((id) => deleteBubble(id))
        if (option.detail?.trim()) {
          addExtension(targetId, `合并说明：${option.detail.trim()}`, 'ai_followup')
        }
        selectBubble(targetId)
      } else {
        const fallbackTargetIds = resolvedOptionTargets.length > 0 ? resolvedOptionTargets : targetBubbleIds
        fallbackTargetIds.forEach((bubbleId) => {
          addExtension(bubbleId, `${option.text}：${option.detail}`, 'ai_followup')
        })
      }
    } else if (action === 'rewrite' && option.newContent?.trim()) {
      const targetId = resolveBubbleId(option.targetBubbleId)
        || resolvedOptionTargets[0]
        || (targetBubbleIds.length === 1 ? targetBubbleIds[0] : null)

      if (targetId) {
        updateBubble(targetId, { content: option.newContent.trim() })
      } else {
        resolvedOptionTargets.forEach((bubbleId) => {
          addExtension(bubbleId, `${option.text}：${option.detail}`, 'ai_followup')
        })
      }
    } else {
      const optionTargetIds = option.targetBubbleIds?.length
        ? resolvedOptionTargets
        : targetBubbleIds
      optionTargetIds.forEach((bubbleId) => {
        addExtension(bubbleId, `${option.text}：${option.detail}`, 'ai_followup')
      })
    }

    if (targetBubbleIds.length >= 2) {
      removeResolvedRelations(targetBubbleIds)
    }
    clearFollowUp()
  }

  return (
    <div className="dock-expand-panel mb-3 overflow-hidden rounded-[28px] bg-white/26 ring-1 ring-white/50">
      <div className="max-h-[min(520px,calc(100vh-260px))] overflow-y-auto p-4">
        <div className={`flex items-center justify-between ${isLoading || !followUpResult ? '' : 'mb-3'}`}>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-on-primary shadow-glow-primary">
              {isLoading || !followUpResult ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
            </span>
            <span className="text-[13px] font-semibold text-primary">
              {panelTitle}
            </span>
          </div>
        </div>

        {isLoading || !followUpResult ? (
          null
        ) : (
          <div className="space-y-2.5">
            <div className="rounded-[22px] bg-white/42 px-4 py-3 text-[13px] leading-relaxed text-on-surface ring-1 ring-white/55">
              {followUpResult.question}
            </div>
            {followUpResult.options.map((option, index) => (
              <button
                key={option.id}
                onClick={() => handleSelect(option)}
                style={{ animationDelay: `${index * 45}ms` }}
                className={`group w-full rounded-[24px] px-4 py-3 text-left transition-all duration-300 ${
                  option.text === '就这样吧'
                    ? 'bg-white/28 text-on-surface-variant ring-1 ring-white/45 hover:bg-primary-fixed/34 hover:text-on-surface'
                    : 'bg-white/42 text-on-surface ring-1 ring-white/55 hover:bg-primary-fixed/38 hover:shadow-glass hover:ring-primary/28'
                } dock-suggestion-card`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    option.text === '就这样吧' ? 'bg-primary-fixed-dim/60' : 'bg-primary'
                  }`} />
                  <span className="text-[13px] font-semibold">{option.text}</span>
                  {option.action === 'merge' && (
                    <span className="ml-auto rounded-full bg-primary-fixed/55 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      确认后合并
                    </span>
                  )}
                  {option.action === 'rewrite' && (
                    <span className="ml-auto rounded-full bg-primary-fixed/55 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      确认后修改
                    </span>
                  )}
                </div>
                {option.detail && option.text !== '就这样吧' && (
                  <div className="text-[11px] text-on-surface-variant mt-1 ml-3.5 opacity-70 group-hover:opacity-100 transition-opacity">
                    {option.detail}
                  </div>
                )}
                {(option.action === 'rewrite' || option.action === 'merge') && option.newContent && (
                  <div className="mt-2 ml-3.5 rounded-2xl bg-white/45 px-3 py-2 text-[11px] leading-relaxed text-on-surface ring-1 ring-white/55">
                    {option.newContent}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
