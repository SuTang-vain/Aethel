import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Bubble, BubbleExtension, BubbleRelation, Category } from './bubbleStore'

export interface SnapshotAnchor {
  label: string
  reason: string
  bubbleIds: string[]
}

export interface SnapshotDetailLayer {
  anchor: string
  summary: string
  bubbleIds: string[]
}

export interface SnapshotDeepLayer {
  bubbleId: string
  source: string
  deepLogic: string
}

export interface SnapshotCognition {
  statusSnapshot: string
  logicFlow: string
  cognitiveGaps: string[]
  semanticAnchors: SnapshotAnchor[]
  wakeTrigger: string
  level2: SnapshotDetailLayer[]
  level3: SnapshotDeepLayer[]
}

export interface Snapshot {
  id: string
  name: string
  thumbnail: string
  createdAt: string
  cognition: SnapshotCognition
  canvasState: {
    bubbles: Bubble[]
    viewport: { x: number; y: number; zoom: number }
    relations?: BubbleRelation[]
    extensions?: BubbleExtension[]
  }
  tagState: {
    tags: string[]
    categories: Category[]
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

const SNAPSHOT_STORE_VERSION = 1

interface SnapshotState {
  snapshots: Snapshot[]
  createSnapshot: (
    name: string,
    bubbles: Bubble[],
    viewport: Snapshot['canvasState']['viewport'],
    categories: Category[],
    cognition?: SnapshotCognition,
    relations?: BubbleRelation[],
    extensions?: BubbleExtension[],
  ) => Snapshot
  restoreSnapshot: (id: string) => Snapshot | null
  deleteSnapshot: (id: string) => void
  renameSnapshot: (id: string, name: string) => void
}

export function createFallbackCognition(bubbles: Bubble[]): SnapshotCognition {
  const weightedBubbles = [...bubbles].sort((a, b) => (b.interactionWeight || 0) - (a.interactionWeight || 0))
  const anchors = [...new Set(weightedBubbles.map((b) => b.tag || b.content.slice(0, 8)).filter(Boolean))]
    .slice(0, 5)

  return {
    statusSnapshot: bubbles.length > 0
      ? `围绕 ${anchors[0] || '当前气泡'} 的工作区快照`
      : '空白工作区快照',
    logicFlow: bubbles.length > 0
      ? `从 ${weightedBubbles[0]?.content || '初始想法'} 出发，当前上下文收束了 ${bubbles.length} 个气泡，并等待进一步建立语义关系。`
      : '当前尚未形成可压缩的上下文脉络。',
    cognitiveGaps: bubbles.length > 0
      ? ['需要明确各气泡之间的因果、递进或对比关系', '需要补充下一步可执行动作']
      : ['需要先创建或选择气泡'],
    semanticAnchors: anchors.map((label) => ({
      label,
      reason: '由标签或高频气泡内容抽取而来',
      bubbleIds: weightedBubbles
        .filter((bubble) => bubble.tag === label || bubble.content.includes(label))
        .map((bubble) => bubble.id)
        .slice(0, 3),
    })),
    wakeTrigger: bubbles.length > 0
      ? `你上次在这里整理了 ${bubbles.length} 个气泡，核心线索是 ${anchors.join('、') || weightedBubbles[0]?.content}，下一步适合补齐关系与执行路径。`
      : '你上次停留在一个空白快照，下一步是先捕捉核心气泡。',
    level2: anchors.map((anchor) => ({
      anchor,
      summary: `围绕「${anchor}」继续展开关键论据、关联片段与待验证问题。`,
      bubbleIds: weightedBubbles
        .filter((bubble) => bubble.tag === anchor || bubble.content.includes(anchor))
        .map((bubble) => bubble.id)
        .slice(0, 3),
    })),
    level3: weightedBubbles.slice(0, 5).map((bubble) => ({
      bubbleId: bubble.id,
      source: bubble.content,
      deepLogic: `原始气泡权重 ${bubble.interactionWeight || 0}，可作为后续溯源入口。`,
    })),
  }
}

type PersistedSnapshotState = Pick<SnapshotState, 'snapshots'>
type PersistedSnapshot = Partial<Snapshot> & {
  canvasState?: Partial<Snapshot['canvasState']>
  tagState?: Partial<Snapshot['tagState']>
}

function normalizeCognitionForStorage(cognition: Partial<SnapshotCognition> | undefined, bubbles: Bubble[]) {
  const fallback = createFallbackCognition(bubbles)

  return {
    statusSnapshot: cognition?.statusSnapshot || fallback.statusSnapshot,
    logicFlow: cognition?.logicFlow || fallback.logicFlow,
    cognitiveGaps: Array.isArray(cognition?.cognitiveGaps) ? cognition.cognitiveGaps : fallback.cognitiveGaps,
    semanticAnchors: Array.isArray(cognition?.semanticAnchors) ? cognition.semanticAnchors : fallback.semanticAnchors,
    wakeTrigger: cognition?.wakeTrigger || fallback.wakeTrigger,
    level2: Array.isArray(cognition?.level2) ? cognition.level2 : fallback.level2,
    level3: Array.isArray(cognition?.level3) ? cognition.level3 : fallback.level3,
  }
}

function migrateSnapshotState(persistedState: unknown): PersistedSnapshotState {
  const state = (persistedState || {}) as Partial<PersistedSnapshotState>

  return {
    snapshots: (state.snapshots || []).map((snapshot: PersistedSnapshot) => {
      const bubbles = snapshot.canvasState?.bubbles || []
      const categories = snapshot.tagState?.categories || []
      const tags = snapshot.tagState?.tags || [...new Set(bubbles.map((bubble) => bubble.tag).filter(Boolean))]

      return {
        id: snapshot.id || generateId(),
        name: snapshot.name || '未命名快照',
        thumbnail: snapshot.thumbnail || '',
        createdAt: snapshot.createdAt || new Date().toISOString(),
        cognition: normalizeCognitionForStorage(snapshot.cognition, bubbles),
        canvasState: {
          bubbles,
          viewport: snapshot.canvasState?.viewport || { x: 0, y: 0, zoom: 1 },
          relations: snapshot.canvasState?.relations || [],
          extensions: snapshot.canvasState?.extensions || [],
        },
        tagState: {
          tags,
          categories,
        },
      }
    }),
  }
}

export const useSnapshotStore = create<SnapshotState>()(persist((set, get) => ({
  snapshots: [],

  createSnapshot: (name, bubbles, viewport, categories, cognition, relations = [], extensions = []) => {
    const tags = [...new Set(bubbles.map((b) => b.tag).filter(Boolean))]
    const snapshot: Snapshot = {
      id: generateId(),
      name,
      thumbnail: '',
      createdAt: new Date().toISOString(),
      cognition: cognition || createFallbackCognition(bubbles),
      canvasState: {
        bubbles: JSON.parse(JSON.stringify(bubbles)),
        viewport: { ...viewport },
        relations: JSON.parse(JSON.stringify(relations)),
        extensions: JSON.parse(JSON.stringify(extensions)),
      },
      tagState: { tags, categories: JSON.parse(JSON.stringify(categories)) },
    }
    set((state) => ({ snapshots: [snapshot, ...state.snapshots] }))
    return snapshot
  },

  restoreSnapshot: (id) => {
    const snapshot = get().snapshots.find((s) => s.id === id)
    return snapshot || null
  },

  deleteSnapshot: (id) => {
    set((state) => ({ snapshots: state.snapshots.filter((s) => s.id !== id) }))
  },

  renameSnapshot: (id, name) => {
    set((state) => ({
      snapshots: state.snapshots.map((s) =>
        s.id === id ? { ...s, name } : s
      ),
    }))
  },
}), {
  name: 'aethel-snapshot-store',
  version: SNAPSHOT_STORE_VERSION,
  storage: createJSONStorage(() => localStorage),
  partialize: (state): PersistedSnapshotState => ({
    snapshots: state.snapshots.map((snapshot) => ({
      ...snapshot,
      thumbnail: '',
    })),
  }),
  migrate: (persistedState) => migrateSnapshotState(persistedState),
}))
