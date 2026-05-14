import { Sparkles } from 'lucide-react'
import { useAiStore } from '@/stores/aiStore'

export default function GlobalAIActivity() {
  const isLoading = useAiStore((state) => state.isLoading)
  const activeTaskLabel = useAiStore((state) => state.activeTaskLabel)

  if (!isLoading) return null

  return (
    <div className="ai-global-activity" aria-live="polite" aria-label={activeTaskLabel || 'AI 正在运行'}>
      <div className="ai-global-frame" />
      <div className="ai-global-corner ai-global-corner-top-left" />
      <div className="ai-global-corner ai-global-corner-top-right" />
      <div className="ai-global-corner ai-global-corner-bottom-left" />
      <div className="ai-global-corner ai-global-corner-bottom-right" />
      <div className="ai-global-status">
        <Sparkles size={15} className="ai-global-status-icon" />
        <span>{activeTaskLabel || 'AI 正在运行'}</span>
        <span className="ai-global-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  )
}
