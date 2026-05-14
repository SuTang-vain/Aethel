import { create } from 'zustand'
import { apiFetch } from '@/lib/apiClient'
import { createRequestKey, dedupeInFlight } from '@/lib/inflightRequests'

interface CategorizeResult {
  categories: Array<{
    name: string
    description: string
    bubbleIds: string[]
    suggestedTag?: string
    confidence: number
  }>
  suggestedTags: Array<{ name: string; color: string; reason: string }>
  relations: Array<{
    sourceId: string
    targetId: string
    type: 'related' | 'contradictory' | 'duplicate'
    reason: string
  }>
}

export interface FollowUpOption {
  id: string
  text: string
  detail: string
  action?: 'append' | 'rewrite' | 'merge'
  targetBubbleId?: string
  targetBubbleIds?: string[]
  sourceBubbleIds?: string[]
  deleteBubbleIds?: string[]
  newContent?: string
}

export interface FollowUpResult {
  question: string
  options: FollowUpOption[]
}

export interface PrdBubbleInput {
  id: string
  content: string
  tag?: string
  extensions?: string[]
}

export interface PrdSectionGroupInput {
  id: string
  title: string
  tag: string
  color: string
  bubbles: PrdBubbleInput[]
}

export interface PrdSectionAiResult {
  groupId: string
  title: string
  content: string
}

export interface WorkshopClarificationQuestion {
  id: string
  label: string
  question: string
  reason: string
  placeholder: string
}

export interface WorkshopCandidateBubble {
  title: string
  content: string
  tag: string
  rationale: string
}

export interface WorkshopSkillResult {
  analysisSummary: string
  needsConfirmation: boolean
  confidence: number
  confirmationPrompt: string
  clarificationQuestions: WorkshopClarificationQuestion[]
  candidateBubbles: WorkshopCandidateBubble[]
  suggestedNextActions: string[]
}

interface AiState {
  isLoading: boolean
  activeTaskLabel: string | null
  error: string | null
  categorizeResult: CategorizeResult | null
  chatStream: string
  followUpResult: FollowUpResult | null
  activeFollowUpBubbleId: string | null
  activeFollowUpBubbleIds: string[]

  categorize: (bubbles: Array<{ id: string; content: string; tag?: string }>, existingTags?: string[]) => Promise<CategorizeResult | null>
  generatePrd: (bubbles: PrdBubbleInput[], template?: string, onChunk?: (content: string) => void) => Promise<string>
  generatePrdSections: (groups: PrdSectionGroupInput[], template?: string) => Promise<PrdSectionAiResult[]>
  sendChat: (messages: Array<{ role: string; content: string }>, onChunk?: (content: string) => void) => Promise<string>
  runWorkshopSkill: (payload: {
    skillId: 'idea-to-bubbles' | 'prd-to-bubbles'
    input: string
    confirmationNotes?: string
    previousQuestions?: WorkshopClarificationQuestion[]
    previousBubbles?: WorkshopCandidateBubble[]
  }) => Promise<WorkshopSkillResult | null>
  followUp: (
    bubbleContent: string,
    existingBubbles: string[],
    options?: { mode?: 'single' | 'relationship'; targetBubbleIds?: string[] },
  ) => Promise<FollowUpResult | null>
  clearError: () => void
  clearCategorizeResult: () => void
  clearFollowUp: () => void
  setGlobalAiActivity: (isLoading: boolean, label?: string | null) => void
}

export const useAiStore = create<AiState>((set) => ({
  isLoading: false,
  activeTaskLabel: null,
  error: null,
  categorizeResult: null,
  chatStream: '',
  followUpResult: null,
  activeFollowUpBubbleId: null,
  activeFollowUpBubbleIds: [],

  categorize: async (bubbles, existingTags = []) => {
    set({ isLoading: true, activeTaskLabel: '正在归类气泡', error: null })
    try {
      const payload = { bubbles, existingTags }
      const data = await dedupeInFlight(createRequestKey('ai:categorize', payload), async () => {
        const response = await apiFetch('/api/ai/categorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          if (err.code === 'NO_API_KEY') {
            throw new Error('请在设置中配置 AI Provider 后再使用归类功能')
          }
          if (err.code === 'PARSE_FAILED') {
            throw new Error('AI 返回格式异常，请稍后重试或更换 Provider')
          }
          throw new Error(err.error || '归类请求失败')
        }

        return response.json()
      })
      const result: CategorizeResult = {
        categories: data.categories || [],
        suggestedTags: data.suggestedTags || [],
        relations: data.relations || [],
      }
      set({ categorizeResult: result, isLoading: false, activeTaskLabel: null })
      return result
    } catch (error: unknown) {
      set({ error: (error as Error).message, isLoading: false, activeTaskLabel: null })
      return null
    }
  },

  generatePrd: async (bubbles, template = 'standard', onChunk) => {
    set({ isLoading: true, activeTaskLabel: '正在生成 PRD', error: null })
    try {
      const response = await apiFetch('/api/ai/generate-prd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bubbleIds: bubbles.map((bubble) => bubble.id),
          bubbles,
          template,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'PRD生成请求失败')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('无法读取响应流')

      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        const lines = text.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.done) break
              if (data.content) {
                fullContent += data.content
                onChunk?.(data.content)
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      }

      set({ isLoading: false, activeTaskLabel: null })
      return fullContent
    } catch (error: unknown) {
      set({ error: (error as Error).message, isLoading: false, activeTaskLabel: null })
      return ''
    }
  },

  generatePrdSections: async (groups, template = 'standard') => {
    set({ isLoading: true, activeTaskLabel: '正在生成 PRD 分区', error: null })
    try {
      const payload = { groups, template }
      const data = await dedupeInFlight(createRequestKey('ai:generate-prd-sections', payload), async () => {
        const response = await apiFetch('/api/ai/generate-prd-sections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || 'PRD分区生成请求失败')
        }

        return response.json()
      })
      const sections: PrdSectionAiResult[] = data.sections || []
      set({ isLoading: false, activeTaskLabel: null })
      return sections
    } catch (error: unknown) {
      set({ error: (error as Error).message, isLoading: false, activeTaskLabel: null })
      return []
    }
  },

  runWorkshopSkill: async (payload) => {
    set({ isLoading: true, activeTaskLabel: '正在运行 AI Skill', error: null })
    try {
      const data = await dedupeInFlight(createRequestKey('ai:workshop-skill', payload), async () => {
        const response = await apiFetch('/api/ai/workshop-skill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || 'Skill 运行失败')
        }

        return response.json()
      })
      const result: WorkshopSkillResult = {
        analysisSummary: data.analysisSummary || '',
        needsConfirmation: Boolean(data.needsConfirmation),
        confidence: Number(data.confidence || 0),
        confirmationPrompt: data.confirmationPrompt || '',
        clarificationQuestions: data.clarificationQuestions || [],
        candidateBubbles: data.candidateBubbles || [],
        suggestedNextActions: data.suggestedNextActions || [],
      }
      set({ isLoading: false, activeTaskLabel: null })
      return result
    } catch (error: unknown) {
      set({ error: (error as Error).message, isLoading: false, activeTaskLabel: null })
      return null
    }
  },

  sendChat: async (messages, onChunk) => {
    set({ isLoading: true, activeTaskLabel: '正在进行 AI 对话', error: null, chatStream: '' })
    try {
      const response = await apiFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, stream: true }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'AI对话请求失败')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('无法读取响应流')

      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        const lines = text.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.done) break
              if (data.content) {
                fullContent += data.content
                set({ chatStream: fullContent })
                onChunk?.(data.content)
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      }

      set({ isLoading: false, activeTaskLabel: null })
      return fullContent
    } catch (error: unknown) {
      set({ error: (error as Error).message, isLoading: false, activeTaskLabel: null })
      return ''
    }
  },

  clearError: () => set({ error: null }),
  clearCategorizeResult: () => set({ categorizeResult: null }),
  clearFollowUp: () => set({ followUpResult: null, activeFollowUpBubbleId: null, activeFollowUpBubbleIds: [] }),
  setGlobalAiActivity: (isLoading, label = null) => set({ isLoading, activeTaskLabel: isLoading ? label : null }),

  followUp: async (bubbleContent, existingBubbles, options) => {
    set({ isLoading: true, activeTaskLabel: options?.mode === 'relationship' ? '正在分析气泡关系' : '正在生成 AI 追问', error: null, followUpResult: null })
    try {
      const payload = { bubbleContent, existingBubbles, ...options }
      const data = await dedupeInFlight(createRequestKey('ai:followup', payload), async () => {
        const response = await apiFetch('/api/ai/followup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || '追问请求失败')
        }

        return response.json()
      })
      const result: FollowUpResult = {
        question: data.question || '想进一步补充吗？',
        options: data.options || [],
      }
      set({ followUpResult: result, isLoading: false, activeTaskLabel: null })
      return result
    } catch (error: unknown) {
      const fallback: FollowUpResult = options?.mode === 'relationship'
        ? {
          question: '这组气泡需要先澄清彼此关系：哪些是重复表达，哪些是约束冲突，哪些可以合并成同一条产品判断。',
          options: [
            {
              id: '1',
              text: '补充关系判断',
              detail: '记录这组气泡之间的冲突、依赖或合并方向，后续再决定是否改写具体气泡。',
              action: 'append',
              targetBubbleIds: options.targetBubbleIds || [],
            },
            {
              id: '2',
              text: '就这样吧',
              detail: '保持当前内容不变',
            },
          ],
        }
        : {
          question: '这条灵感还可以从哪个方向补一笔？',
          options: [
            {
              id: '1',
              text: '补充目标用户',
              detail: '说明这个想法主要服务谁，以及他们遇到的真实场景。',
            },
            {
              id: '2',
              text: '补充使用场景',
              detail: '描述它会在什么时候被触发，以及前后发生了什么。',
            },
            {
              id: '3',
              text: '补充判断标准',
              detail: '写下怎样才算这个想法被验证或实现得足够好。',
            },
            {
              id: '4',
              text: '就这样吧',
              detail: '保持当前内容不变',
            },
          ],
        }
      set({ error: (error as Error).message, followUpResult: fallback, isLoading: false, activeTaskLabel: null })
      return fallback
    }
  },
}))
