import type { Bubble, BubbleExtension, Category } from '@/stores/bubbleStore'
import { apiFetch } from '@/lib/apiClient'
import {
  createFallbackCognition,
  type SnapshotCognition,
} from '@/stores/snapshotStore'

export const SNAPSHOT_BACKEND_ERROR_MESSAGE = '后端服务异常，请稍后再试'

export type SnapshotCognitionResult = {
  cognition: SnapshotCognition
  source: 'ai' | 'fallback'
  error?: string
}

export function normalizeCognition(data: Partial<SnapshotCognition>, fallback: SnapshotCognition): SnapshotCognition {
  return {
    statusSnapshot: data.statusSnapshot || fallback.statusSnapshot,
    logicFlow: data.logicFlow || fallback.logicFlow,
    cognitiveGaps: Array.isArray(data.cognitiveGaps) && data.cognitiveGaps.length > 0
      ? data.cognitiveGaps
      : fallback.cognitiveGaps,
    semanticAnchors: Array.isArray(data.semanticAnchors) && data.semanticAnchors.length > 0
      ? data.semanticAnchors.slice(0, 5)
      : fallback.semanticAnchors,
    wakeTrigger: data.wakeTrigger || fallback.wakeTrigger,
    level2: Array.isArray(data.level2) && data.level2.length > 0
      ? data.level2
      : fallback.level2,
    level3: Array.isArray(data.level3) && data.level3.length > 0
      ? data.level3
      : fallback.level3,
  }
}

function isNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
}

function hasCompleteCognition(data: Partial<SnapshotCognition>) {
  return (
    isNonEmptyString(data.statusSnapshot)
    && isNonEmptyString(data.logicFlow)
    && isNonEmptyString(data.wakeTrigger)
    && Array.isArray(data.cognitiveGaps)
    && data.cognitiveGaps.length > 0
    && Array.isArray(data.semanticAnchors)
    && data.semanticAnchors.length > 0
    && Array.isArray(data.level2)
    && data.level2.length > 0
    && Array.isArray(data.level3)
    && data.level3.length > 0
  )
}

export function buildSnapshotPayload(bubbles: Bubble[], extensions: BubbleExtension[]) {
  return bubbles.map((bubble) => ({
    id: bubble.id,
    content: bubble.content,
    tag: bubble.tag || undefined,
    interactionWeight: bubble.interactionWeight || 0,
    extensions: extensions
      .filter((extension) => extension.bubbleId === bubble.id)
      .map((extension) => extension.content),
  }))
}

export async function requestSnapshotCognition(
  bubbles: Bubble[],
  extensions: BubbleExtension[],
  categories: Category[],
): Promise<SnapshotCognitionResult> {
  const fallback = createFallbackCognition(bubbles)

  try {
    const response = await apiFetch('/api/ai/snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bubbles: buildSnapshotPayload(bubbles, extensions),
        categories,
      }),
    })

    if (!response.ok) throw new Error(SNAPSHOT_BACKEND_ERROR_MESSAGE)
    const data = await response.json()
    if (!hasCompleteCognition(data)) throw new Error(SNAPSHOT_BACKEND_ERROR_MESSAGE)
    return {
      cognition: normalizeCognition(data, fallback),
      source: 'ai',
    }
  } catch (error) {
    const message = (error as Error).message
    throw new Error(message || SNAPSHOT_BACKEND_ERROR_MESSAGE)
  }
}
