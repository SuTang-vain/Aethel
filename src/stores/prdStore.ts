import { create } from 'zustand'

export interface PrdModule {
  id: string
  type: 'background' | 'user_story' | 'flowchart' | 'data_tracking' | 'requirement' | 'custom'
  title: string
  content: string
  bubbleIds: string[]
  order: number
}

export interface PrdSectionDraft {
  id: string
  title: string
  tag: string
  color: string
  bubbleIds: string[]
  content: string
  order: number
  updatedAt: string
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

interface PrdState {
  modules: PrdModule[]
  selectedModuleId: string | null
  isGenerating: boolean
  generatedContent: string
  sectionDrafts: PrdSectionDraft[]
  template: 'standard' | 'lean' | 'detailed'

  addModule: (module: Omit<PrdModule, 'id' | 'order'>) => void
  updateModule: (id: string, updates: Partial<PrdModule>) => void
  deleteModule: (id: string) => void
  reorderModules: (modules: PrdModule[]) => void
  selectModule: (id: string | null) => void
  setGenerating: (isGenerating: boolean) => void
  setGeneratedContent: (content: string) => void
  appendGeneratedContent: (content: string) => void
  setSectionDrafts: (sections: Array<Omit<PrdSectionDraft, 'id' | 'order' | 'updatedAt'> & { id?: string; order?: number }>) => void
  updateSectionDraft: (id: string, updates: Partial<PrdSectionDraft>) => void
  clearSectionDrafts: () => void
  setTemplate: (template: PrdState['template']) => void
  clearModules: () => void
}

export const usePrdStore = create<PrdState>((set) => ({
  modules: [],
  selectedModuleId: null,
  isGenerating: false,
  generatedContent: '',
  sectionDrafts: [],
  template: 'standard',

  addModule: (module) => {
    const newModule: PrdModule = {
      ...module,
      id: generateId(),
      order: 0,
    }
    set((state) => ({
      modules: [...state.modules, { ...newModule, order: state.modules.length }],
    }))
  },

  updateModule: (id, updates) => {
    set((state) => ({
      modules: state.modules.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    }))
  },

  deleteModule: (id) => {
    set((state) => ({
      modules: state.modules.filter((m) => m.id !== id).map((m, i) => ({ ...m, order: i })),
      selectedModuleId: state.selectedModuleId === id ? null : state.selectedModuleId,
    }))
  },

  reorderModules: (modules) => set({ modules }),

  selectModule: (id) => set({ selectedModuleId: id }),

  setGenerating: (isGenerating) => set({ isGenerating }),

  setGeneratedContent: (content) => set({ generatedContent: content }),

  appendGeneratedContent: (content) =>
    set((state) => ({ generatedContent: state.generatedContent + content })),

  setSectionDrafts: (sections) => {
    const now = new Date().toISOString()
    set({
      sectionDrafts: sections.map((section, index) => ({
        id: section.id || generateId(),
        title: section.title,
        tag: section.tag,
        color: section.color,
        bubbleIds: section.bubbleIds,
        content: section.content,
        order: section.order ?? index,
        updatedAt: now,
      })),
    })
  },

  updateSectionDraft: (id, updates) => {
    set((state) => ({
      sectionDrafts: state.sectionDrafts.map((section) =>
        section.id === id ? { ...section, ...updates, updatedAt: new Date().toISOString() } : section
      ),
    }))
  },

  clearSectionDrafts: () => set({ sectionDrafts: [] }),

  setTemplate: (template) => set({ template }),

  clearModules: () => set({ modules: [], generatedContent: '', sectionDrafts: [] }),
}))
