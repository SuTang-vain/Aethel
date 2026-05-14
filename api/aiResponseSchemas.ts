type JsonRecord = Record<string, unknown>

const RELATION_TYPES = new Set(['related', 'contradictory', 'duplicate'])
const FOLLOWUP_ACTIONS = new Set(['append', 'rewrite', 'merge'])

function asRecord(value: unknown): JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as JsonRecord : {}
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => asString(item)).filter(Boolean)
    : []
}

function coerceIdString(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (value && typeof value === 'object') {
    const record = value as JsonRecord
    const candidate = record.id ?? record.bubbleId ?? record.bubble_id
    if (typeof candidate === 'string') return candidate.trim()
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return String(candidate)
  }
  return ''
}

function coerceIdArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => coerceIdString(item)).filter(Boolean)
    : []
}

function asNumber(value: unknown, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function clampConfidence(value: unknown) {
  return Math.max(0, Math.min(1, asNumber(value, 0)))
}

function fallbackFollowup(isRelationshipMode: boolean, targetBubbleIds: string[]) {
  return isRelationshipMode
    ? {
      question: '这些气泡之间可能存在关系或冲突，但 AI 返回格式异常。建议先把关键差异补充到相关气泡中。',
      options: [
        {
          id: '1',
          text: '补充关系判断',
          detail: '记录这组气泡之间仍需澄清的关系、冲突或合并路径。',
          action: 'append',
          targetBubbleIds,
        },
        { id: '2', text: '就这样吧', detail: '保持当前内容不变' },
      ],
    }
    : {
      question: '想进一步补充吗？',
      options: [
        { id: '1', text: '补充更多细节', detail: '添加更多具体描述' },
        { id: '2', text: '就这样吧', detail: '保持当前内容不变' },
      ],
    }
}

export function normalizeCategorizeResponse(value: unknown) {
  const record = asRecord(value)
  const categories = Array.isArray(record.categories)
    ? record.categories.map((item) => {
      const category = asRecord(item)
      return {
        name: asString(category.name, '未命名分类'),
        description: asString(category.description),
        bubbleIds: coerceIdArray(category.bubbleIds),
        suggestedTag: asString(category.suggestedTag),
        confidence: clampConfidence(category.confidence),
      }
    }).filter((category) => category.name && category.bubbleIds.length > 0)
    : []

  const suggestedTags = Array.isArray(record.suggestedTags)
    ? record.suggestedTags.map((item) => {
      const tag = asRecord(item)
      return {
        name: asString(tag.name),
        color: asString(tag.color, '#94a3b8'),
        reason: asString(tag.reason),
      }
    }).filter((tag) => tag.name)
    : []

  const relations = Array.isArray(record.relations)
    ? record.relations.map((item) => {
      const relation = asRecord(item)
      const type = asString(relation.type)
      return {
        sourceId: coerceIdString(relation.sourceId),
        targetId: coerceIdString(relation.targetId),
        type: RELATION_TYPES.has(type) ? type as 'related' | 'contradictory' | 'duplicate' : 'related',
        reason: asString(relation.reason),
      }
    }).filter((relation) => relation.sourceId && relation.targetId && relation.sourceId !== relation.targetId)
    : []

  return { categories, suggestedTags, relations }
}

export function normalizeSnapshotResponse(value: unknown, options: { bubbleIds?: string[] } = {}) {
  const record = asRecord(value)
  const allowedBubbleIds = new Set((options.bubbleIds || []).map((id) => String(id || '').trim()).filter(Boolean))
  const normalizeBubbleIds = (rawValue: unknown) => {
    const ids = coerceIdArray(rawValue)
    return allowedBubbleIds.size > 0 ? ids.filter((id) => allowedBubbleIds.has(id)) : ids
  }

  const semanticAnchors = Array.isArray(record.semanticAnchors)
    ? record.semanticAnchors.map((item) => {
      if (typeof item === 'string') {
        return { label: item.trim(), reason: '', bubbleIds: [] }
      }
      const anchor = asRecord(item)
      return {
        label: asString(anchor.label || anchor.anchor),
        reason: asString(anchor.reason),
        bubbleIds: normalizeBubbleIds(anchor.bubbleIds),
      }
    }).filter((anchor) => anchor.label)
    : []

  const level2 = Array.isArray(record.level2)
    ? record.level2.map((item) => {
      if (typeof item === 'string') {
        return { anchor: item.trim(), summary: item.trim(), bubbleIds: [] }
      }
      const layer = asRecord(item)
      return {
        anchor: asString(layer.anchor || layer.label),
        summary: asString(layer.summary || layer.reason),
        bubbleIds: normalizeBubbleIds(layer.bubbleIds),
      }
    }).filter((layer) => layer.anchor && layer.summary)
    : []

  const level3 = Array.isArray(record.level3)
    ? record.level3.map((item) => {
      const layer = asRecord(item)
      const bubbleId = coerceIdString(layer.bubbleId || layer.id)
      return {
        bubbleId,
        source: asString(layer.source),
        deepLogic: asString(layer.deepLogic || layer.logic || layer.reason),
      }
    }).filter((layer) => (
      layer.bubbleId
      && (!allowedBubbleIds.size || allowedBubbleIds.has(layer.bubbleId))
      && (layer.source || layer.deepLogic)
    ))
    : []

  return {
    statusSnapshot: asString(record.statusSnapshot || record.status || record.summary),
    logicFlow: asString(record.logicFlow || record.logic || record.flow),
    cognitiveGaps: asStringArray(record.cognitiveGaps),
    semanticAnchors,
    wakeTrigger: asString(record.wakeTrigger),
    level2,
    level3,
  }
}

export function normalizeFollowupResponse(value: unknown, options: { isRelationshipMode: boolean; targetBubbleIds?: unknown[] }) {
  const targetBubbleIds = asStringArray(options.targetBubbleIds)
  const record = asRecord(value)
  const rawOptions = Array.isArray(record.options) ? record.options : []
  const parsedOptions = rawOptions.map((item, index) => {
    const option = asRecord(item)
    const action = asString(option.action)
    const normalized: JsonRecord = {
      id: asString(option.id, String(index + 1)),
      text: asString(option.text),
      detail: asString(option.detail),
    }

    if (FOLLOWUP_ACTIONS.has(action)) normalized.action = action
    if (asString(option.targetBubbleId)) normalized.targetBubbleId = asString(option.targetBubbleId)
    if (asString(option.newContent)) normalized.newContent = asString(option.newContent)
    const targetIds = asStringArray(option.targetBubbleIds)
    const sourceIds = asStringArray(option.sourceBubbleIds)
    const deleteIds = asStringArray(option.deleteBubbleIds)
    if (targetIds.length > 0) normalized.targetBubbleIds = targetIds
    if (sourceIds.length > 0) normalized.sourceBubbleIds = sourceIds
    if (deleteIds.length > 0) normalized.deleteBubbleIds = deleteIds

    return normalized
  }).filter((option) => asString(option.text))

  if (!asString(record.question) || parsedOptions.length === 0) {
    return fallbackFollowup(options.isRelationshipMode, targetBubbleIds)
  }

  if (!parsedOptions.some((option) => asString(option.text) === '就这样吧')) {
    parsedOptions.push({ id: String(parsedOptions.length + 1), text: '就这样吧', detail: '保持当前内容不变' })
  }

  return {
    question: asString(record.question).slice(0, 220),
    options: parsedOptions,
  }
}
