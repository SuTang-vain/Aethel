import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  GripVertical,
  Layers3,
  Loader2,
  Sparkles,
  WandSparkles,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useBubbleStore, type Bubble } from '@/stores/bubbleStore'
import { usePrdStore } from '@/stores/prdStore'
import { useAiStore, type PrdSectionGroupInput } from '@/stores/aiStore'

interface BubbleGroup {
  id: string
  title: string
  tag: string
  color: string
  bubbles: Bubble[]
  order: number
}

const SECTION_ORDER = ['核心', '概念', '用户', '场景', '价值', '模块', '功能', '风险', '验证', '未归类']

function sameIds(left: string[], right: string[]) {
  if (left.length !== right.length) return false
  const rightSet = new Set(right)
  return left.every((id) => rightSet.has(id))
}

function groupOrder(title: string) {
  const index = SECTION_ORDER.findIndex((keyword) => title.includes(keyword))
  return index === -1 ? SECTION_ORDER.length : index
}

function sectionMarkdown(title: string, content: string) {
  const trimmed = content.trim()
  return [`## ${title.trim() || '未命名章节'}`, '', trimmed || '_待补充_', ''].join('\n')
}

export default function PrdOutput() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    bubbles,
    categories,
    extensions,
    selectedBubbleIds: workspaceSelectedBubbleIds,
    setSelectedBubbleIds: setWorkspaceSelectedBubbleIds,
    incrementPrdUsage,
  } = useBubbleStore()
  const {
    generatedContent,
    isGenerating,
    setGenerating,
    setGeneratedContent,
    template,
    setTemplate,
    sectionDrafts,
    setSectionDrafts,
    updateSectionDraft,
    clearSectionDrafts,
  } = usePrdStore()
  const { generatePrdSections } = useAiStore()

  const [selectedBubbleIds, setSelectedBubbleIds] = useState<Set<string>>(new Set())
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const previewRef = useRef<HTMLDivElement>(null)
  const routeSelectionAppliedRef = useRef(false)
  const routeState = location.state as { preselectedBubbleIds?: string[]; from?: string } | null
  const cameFromWorkshop = routeState?.from === 'workshop'

  const bubbleGroups = useMemo<BubbleGroup[]>(() => {
    const categoryById = new Map(categories.map((category) => [category.id, category]))
    const groupMap = new Map<string, BubbleGroup>()

    bubbles.forEach((bubble) => {
      const category = bubble.categoryId ? categoryById.get(bubble.categoryId) : undefined
      const title = bubble.tag || category?.name || '未归类补充'
      const color = bubble.color || category?.color || '#94a3b8'
      const id = `${bubble.tag ? 'tag' : category ? 'category' : 'untagged'}:${title}`
      const existing = groupMap.get(id)

      if (existing) {
        existing.bubbles.push(bubble)
        return
      }

      groupMap.set(id, {
        id,
        title,
        tag: title,
        color,
        bubbles: [bubble],
        order: groupOrder(title),
      })
    })

    return Array.from(groupMap.values()).sort((left, right) => {
      if (left.order !== right.order) return left.order - right.order
      return left.title.localeCompare(right.title, 'zh-CN')
    })
  }, [bubbles, categories])

  const selectedGroups = useMemo(() => (
    bubbleGroups
      .map((group) => ({
        ...group,
        bubbles: group.bubbles.filter((bubble) => selectedBubbleIds.has(bubble.id)),
      }))
      .filter((group) => group.bubbles.length > 0)
  ), [bubbleGroups, selectedBubbleIds])

  const combinedContent = useMemo(() => {
    if (sectionDrafts.length > 0) {
      return sectionDrafts
        .slice()
        .sort((left, right) => left.order - right.order)
        .map((section) => sectionMarkdown(section.title, section.content))
        .join('\n')
        .trim()
    }
    return generatedContent
  }, [generatedContent, sectionDrafts])

  useEffect(() => {
    const validBubbleIds = new Set(bubbles.map((bubble) => bubble.id))
    const routeBubbleIds = Array.isArray(routeState?.preselectedBubbleIds)
      ? routeState.preselectedBubbleIds.filter((id) => validBubbleIds.has(id))
      : []

    if (routeBubbleIds.length > 0 && !routeSelectionAppliedRef.current) {
      routeSelectionAppliedRef.current = true
      setSelectedBubbleIds(new Set(routeBubbleIds))
      if (!sameIds(workspaceSelectedBubbleIds, routeBubbleIds)) {
        setWorkspaceSelectedBubbleIds(routeBubbleIds)
      }
      return
    }

    const validWorkspaceIds = workspaceSelectedBubbleIds.filter((id) => validBubbleIds.has(id))
    if (validWorkspaceIds.length > 0) {
      setSelectedBubbleIds(new Set(validWorkspaceIds))
    }
  }, [bubbles, routeState?.preselectedBubbleIds, setWorkspaceSelectedBubbleIds, workspaceSelectedBubbleIds])

  const syncSelection = (ids: string[]) => {
    setSelectedBubbleIds(new Set(ids))
    setWorkspaceSelectedBubbleIds(ids)
    clearSectionDrafts()
    setGeneratedContent('')
  }

  const toggleBubble = (id: string) => {
    const next = new Set(selectedBubbleIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    syncSelection(Array.from(next))
  }

  const toggleGroup = (group: BubbleGroup) => {
    const next = new Set(selectedBubbleIds)
    const groupIds = group.bubbles.map((bubble) => bubble.id)
    const allSelected = groupIds.every((id) => next.has(id))
    groupIds.forEach((id) => {
      if (allSelected) next.delete(id)
      else next.add(id)
    })
    syncSelection(Array.from(next))
  }

  const selectAll = () => {
    if (selectedBubbleIds.size === bubbles.length) {
      syncSelection([])
    } else {
      syncSelection(bubbles.map((bubble) => bubble.id))
    }
  }

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((current) => {
      const next = new Set(current)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  const buildAiGroups = useCallback((): PrdSectionGroupInput[] => selectedGroups.map((group) => ({
    id: group.id,
    title: group.title,
    tag: group.tag,
    color: group.color,
    bubbles: group.bubbles.map((bubble) => ({
      id: bubble.id,
      content: bubble.content,
      tag: bubble.tag || group.tag,
      extensions: extensions
        .filter((extension) => extension.bubbleId === bubble.id)
        .map((extension) => extension.content),
    })),
  })), [extensions, selectedGroups])

  const handleGenerate = useCallback(async () => {
    if (selectedBubbleIds.size === 0 || selectedGroups.length === 0) return
    setGenerating(true)
    setGeneratedContent('')
    clearSectionDrafts()

    const aiGroups = buildAiGroups()
    const selectedIds = Array.from(selectedBubbleIds)

    try {
      const sections = await generatePrdSections(aiGroups, template)
      const sectionByGroupId = new Map(sections.map((section) => [section.groupId, section]))
      const drafts = aiGroups.map((group, index) => {
        const generated = sectionByGroupId.get(group.id)
        const fallback = group.bubbles
          .map((bubble) => `- ${bubble.content}${bubble.extensions?.length ? `\n  - 追问补充：${bubble.extensions.join('；')}` : ''}`)
          .join('\n')

        return {
          title: generated?.title || group.title,
          tag: group.tag,
          color: group.color,
          bubbleIds: group.bubbles.map((bubble) => bubble.id),
          content: generated?.content || fallback,
          order: index,
        }
      })

      setSectionDrafts(drafts)
      setGeneratedContent(drafts.map((section) => sectionMarkdown(section.title, section.content)).join('\n').trim())
      incrementPrdUsage(selectedIds)
    } finally {
      setGenerating(false)
    }
  }, [
    buildAiGroups,
    clearSectionDrafts,
    generatePrdSections,
    incrementPrdUsage,
    selectedBubbleIds,
    selectedGroups.length,
    setGeneratedContent,
    setGenerating,
    setSectionDrafts,
    template,
  ])

  const moveSection = (id: string, direction: -1 | 1) => {
    const ordered = sectionDrafts.slice().sort((left, right) => left.order - right.order)
    const index = ordered.findIndex((section) => section.id === id)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return

    const next = ordered.slice()
    const [section] = next.splice(index, 1)
    next.splice(nextIndex, 0, section)
    next.forEach((item, order) => updateSectionDraft(item.id, { order }))
  }

  const goToPrdWorkshop = () => {
    navigate('/workshop?skill=prd-to-bubbles')
  }

  const handleExportMarkdown = () => {
    if (!combinedContent) return
    const blob = new Blob([combinedContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `PRD_${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPDF = async () => {
    if (!previewRef.current || !combinedContent) return
    const html2canvas = (await import('html2canvas')).default
    const jsPDF = (await import('jspdf')).default

    const canvas = await html2canvas(previewRef.current, {
      backgroundColor: '#fffaf4',
      scale: 2,
    })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
    pdf.save(`PRD_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  return (
    <div className="h-screen bg-background dot-grid-bg relative overflow-hidden">
      {combinedContent && (
        <div
          ref={previewRef}
          aria-hidden="true"
          className="fixed -left-[10000px] top-0 w-[820px] bg-[#fffaf4] p-8 prose prose-stone prose-sm max-w-none"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{combinedContent}</ReactMarkdown>
        </div>
      )}

      <div className="relative z-10 h-full p-6">
        <div className="absolute left-6 top-20 bottom-6 w-[340px] z-10">
          <section className="floating-window liquid-vessel h-full rounded-[32px] flex flex-col overflow-hidden" data-testid="prd-bubble-selector">
            <div className="px-5 py-4 border-b border-white/35">
              <div className="flex items-center justify-between">
                <span className="text-[15px] text-on-surface font-semibold">选择气泡</span>
                <button onClick={selectAll} className="rounded-full px-2 py-1 text-[11px] font-semibold text-primary transition-all hover:bg-primary-fixed/35">
                  {selectedBubbleIds.size === bubbles.length ? '取消全选' : '全选'}
                </button>
              </div>
              <div className="text-[12px] text-outline mt-1">
                已选 {selectedBubbleIds.size} / {bubbles.length}
              </div>
              {cameFromWorkshop && selectedBubbleIds.size > 0 && (
                <div className="mt-2 rounded-[18px] bg-secondary-container/32 px-3 py-2 text-[11px] leading-4 text-secondary">
                  已接收工坊生成的 {selectedBubbleIds.size} 个气泡，可直接生成 PRD 或继续微调选择。
                </div>
              )}
              <button
                onClick={goToPrdWorkshop}
                className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-white/38 text-[12px] font-semibold text-on-surface-variant ring-1 ring-white/60 transition-all hover:bg-secondary-container/35 hover:text-secondary"
              >
                <WandSparkles size={13} />
                已有 PRD 草稿？先拆成气泡
              </button>
            </div>

            <div className="edge-fade-scroll flex-1 overflow-y-auto py-2">
              {bubbles.length === 0 ? (
                <div className="px-5 py-8 text-center text-[13px] text-outline">
                  <div>暂无气泡，请先在灵感空间创建</div>
                  <button
                    onClick={goToPrdWorkshop}
                    className="mt-4 inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-secondary-container/45 px-4 text-[12px] font-semibold text-secondary transition-all hover:bg-secondary-container"
                  >
                    <WandSparkles size={13} />
                    拆解 PRD 草稿
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 px-3 py-2.5">
                  {bubbleGroups.map((group) => {
                    const selectedCount = group.bubbles.filter((bubble) => selectedBubbleIds.has(bubble.id)).length
                    const allSelected = selectedCount === group.bubbles.length
                    const collapsed = collapsedGroups.has(group.id)

                    return (
                      <section
                        key={group.id}
                        className="surface-list-card overflow-hidden rounded-[24px] transition-all"
                        style={{ borderColor: `${group.color}26` }}
                      >
                        <div className="flex items-center gap-2 px-3 py-3">
                          <button
                            onClick={() => toggleGroup(group)}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all"
                            style={{
                              borderColor: allSelected ? group.color : `${group.color}66`,
                              backgroundColor: allSelected ? `${group.color}22` : 'transparent',
                              color: group.color,
                            }}
                            title={allSelected ? '取消选择整组' : '选择整组'}
                          >
                            {selectedCount > 0 && <Check size={12} />}
                          </button>
                          <button
                            onClick={() => toggleGroupCollapse(group.id)}
                            className="min-w-0 flex flex-1 items-center gap-2 text-left"
                          >
                            <span className="h-3 w-3 shrink-0 rounded-full ring-4 ring-white/55" style={{ backgroundColor: group.color }} />
                            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-on-surface">{group.title}</span>
                            <span className="rounded-full bg-white/40 px-2 py-0.5 text-[10px] text-outline">{selectedCount}/{group.bubbles.length}</span>
                            {collapsed ? <ChevronDown size={13} className="text-outline" /> : <ChevronUp size={13} className="text-outline" />}
                          </button>
                        </div>

                        {!collapsed && (
                          <div className="space-y-1 border-t border-white/35 px-2 pb-2 pt-1.5">
                            {group.bubbles.map((bubble) => {
                              const selected = selectedBubbleIds.has(bubble.id)
                              return (
                                <button
                                  key={bubble.id}
                                  onClick={() => toggleBubble(bubble.id)}
                                  className={`selectable-bubble-card w-full rounded-[18px] px-2.5 py-2 text-left text-[12px] transition-all ${
                                    selected
                                      ? 'is-selected text-on-surface'
                                      : 'text-on-surface-variant hover:text-on-surface'
                                  }`}
                                  style={{
                                    '--bubble-border': `${group.color}40`,
                                    '--bubble-border-strong': `${group.color}60`,
                                    '--bubble-border-selected': `${group.color}8a`,
                                    '--bubble-focus': `${group.color}12`,
                                    '--bubble-tint': `${group.color}0d`,
                                    '--bubble-tint-selected': `${group.color}18`,
                                  } as React.CSSProperties}
                                >
                                  <div className="flex items-start gap-2">
                                    <span
                                      className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border"
                                      style={{
                                        borderColor: selected ? group.color : `${group.color}55`,
                                        color: group.color,
                                      }}
                                    >
                                      {selected && <Check size={10} />}
                                    </span>
                                    <span className="line-clamp-2 min-w-0 flex-1 leading-5">{bubble.content}</span>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </section>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-outline-variant/20">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || selectedBubbleIds.size === 0}
                className="w-full btn-liquid text-[13px] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid="generate-prd"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    分区生成中...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    AI 生成 PRD
                  </>
                )}
              </button>
            </div>
          </section>
        </div>

        <section className="absolute left-[370px] right-6 top-20 bottom-6 z-10 floating-window liquid-vessel rounded-[32px] overflow-hidden flex flex-col">
          <div className="px-7 py-5 border-b border-white/35 flex items-center justify-between gap-4">
            <div className="min-w-[132px]">
              <div className="whitespace-nowrap text-[17px] font-semibold text-on-surface">PRD 输出中心</div>
              <div className="text-[12px] text-outline truncate">按标签归束气泡，生成可编辑的结构化 PRD 草稿</div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                value={template}
                onChange={(event) => setTemplate(event.target.value as 'standard' | 'lean' | 'detailed')}
                className="input-field text-[13px] !py-2"
              >
                <option value="standard">标准模板</option>
                <option value="lean">精简模板</option>
                <option value="detailed">详细模板</option>
              </select>

              <button
                onClick={handleExportMarkdown}
                disabled={!combinedContent}
                className="btn-glass text-[13px] flex items-center gap-1 disabled:opacity-40"
                data-testid="export-markdown"
              >
                <Download size={12} />
                Markdown
              </button>

              <button
                onClick={handleExportPDF}
                disabled={!combinedContent}
                className="btn-glass text-[13px] flex items-center gap-1 disabled:opacity-40"
                data-testid="export-pdf"
              >
                <Download size={12} />
                PDF
              </button>
            </div>
          </div>

          <div className="edge-fade-scroll-soft flex-1 overflow-y-auto px-7 py-6">
            {sectionDrafts.length > 0 ? (
              <div className="space-y-5">
                {sectionDrafts
                  .slice()
                  .sort((left, right) => left.order - right.order)
                  .map((section, index, orderedSections) => (
                    <section
                      key={section.id}
                      className="prd-section-card overflow-hidden rounded-[30px]"
                      style={{ '--prd-section-color': section.color } as React.CSSProperties}
                    >
                      <div className="flex items-center gap-2 px-5 pb-3 pt-4">
                        <GripVertical size={14} className="text-outline/70" />
                        <span
                          className="h-7 w-1.5 shrink-0 rounded-full shadow-glass"
                          style={{ backgroundColor: section.color }}
                        />
                        <input
                          value={section.title}
                          onChange={(event) => updateSectionDraft(section.id, { title: event.target.value })}
                          className="prd-section-title-input min-w-0 flex-1 px-3 py-1.5 text-[15px] font-semibold"
                          data-testid="prd-section-title"
                        />
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${section.color}18`, color: section.color }}>
                          {section.tag}
                        </span>
                        <button
                          onClick={() => moveSection(section.id, -1)}
                          disabled={index === 0}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/34 text-outline transition-all hover:bg-secondary-container/45 hover:text-secondary disabled:cursor-not-allowed disabled:opacity-30"
                          title="上移章节"
                        >
                          <ChevronUp size={13} />
                        </button>
                        <button
                          onClick={() => moveSection(section.id, 1)}
                          disabled={index === orderedSections.length - 1}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/34 text-outline transition-all hover:bg-secondary-container/45 hover:text-secondary disabled:cursor-not-allowed disabled:opacity-30"
                          title="下移章节"
                        >
                          <ChevronDown size={13} />
                        </button>
                      </div>
                      <div className="px-5 pb-5">
                        <textarea
                          value={section.content}
                          onChange={(event) => updateSectionDraft(section.id, { content: event.target.value })}
                          className="prd-section-editor min-h-[220px] w-full resize-y px-5 py-4 text-[13px] leading-7"
                          data-testid="prd-section-editor"
                        />
                      </div>
                    </section>
                  ))}
              </div>
            ) : selectedGroups.length > 0 ? (
              <div className="space-y-4">
                <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-on-surface">
                  <Layers3 size={15} className="text-secondary" />
                  将生成 {selectedGroups.length} 个 PRD 章节
                </div>
                {selectedGroups.map((group) => (
                  <section
                    key={group.id}
                    className="prd-section-card rounded-[28px] p-4"
                    style={{ '--prd-section-color': group.color } as React.CSSProperties}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className="h-6 w-1.5 shrink-0 rounded-full shadow-glass"
                        style={{ backgroundColor: group.color }}
                      />
                      <div className="text-[14px] font-semibold text-on-surface">{group.title}</div>
                      <div className="ml-auto rounded-full bg-white/40 px-2 py-0.5 text-[11px] text-outline">{group.bubbles.length} 个气泡</div>
                    </div>
                    <div className="space-y-1.5">
                      {group.bubbles.slice(0, 4).map((bubble) => (
                        <div key={bubble.id} className="line-clamp-1 text-[12px] leading-5 text-on-surface-variant">
                          {bubble.content}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <FileText size={48} className="text-outline-variant mb-4" />
                <p className="text-on-surface-variant text-[13px]">选择气泡并点击生成</p>
                <p className="text-outline text-[11px] mt-1">AI 将按标签归束生成可编辑 PRD 章节</p>
                <button
                  onClick={goToPrdWorkshop}
                  className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white/48 px-5 text-[12px] font-semibold text-on-surface-variant ring-1 ring-white/65 transition-all hover:bg-secondary-container/45 hover:text-secondary"
                >
                  <WandSparkles size={14} />
                  先拆解已有 PRD 草稿
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
