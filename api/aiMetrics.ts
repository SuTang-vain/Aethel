import type { AIProvider, AITaskProfile } from './aiProfiles.js'

export interface AIMetricRecord {
  id: string
  provider: AIProvider
  model: string
  profile: AITaskProfile
  latencyMs: number
  cacheHit: boolean
  pendingReuse: boolean
  fallbackReason?: string
  success: boolean
  statusCode?: number
  createdAt: string
}

const MAX_AI_METRICS = 80
const aiMetrics: AIMetricRecord[] = []

export function recordAIMetric(record: Omit<AIMetricRecord, 'id' | 'createdAt'>) {
  aiMetrics.unshift({
    ...record,
    id: `ai_metric_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  })

  if (aiMetrics.length > MAX_AI_METRICS) {
    aiMetrics.splice(MAX_AI_METRICS)
  }
}

export function getAIMetrics() {
  return aiMetrics.slice()
}

export function clearAIMetricsForTests() {
  aiMetrics.splice(0)
}
