import { create } from 'zustand'

type PersistenceStatus = 'idle' | 'loading' | 'saving' | 'saved' | 'error'

interface PersistenceState {
  status: PersistenceStatus
  error: string | null
  lastSavedAt: string | null
  setLoading: () => void
  setSaving: () => void
  setSaved: () => void
  setError: (error: string) => void
}

export const usePersistenceStore = create<PersistenceState>((set) => ({
  status: 'idle',
  error: null,
  lastSavedAt: null,

  setLoading: () => set({ status: 'loading', error: null }),
  setSaving: () => set({ status: 'saving', error: null }),
  setSaved: () => set({ status: 'saved', error: null, lastSavedAt: new Date().toISOString() }),
  setError: (error) => set({ status: 'error', error }),
}))
