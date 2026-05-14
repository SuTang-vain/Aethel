import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Plus, Send } from 'lucide-react'
import { useBubbleStore } from '@/stores/bubbleStore'
import { useAiStore } from '@/stores/aiStore'

interface SpeechRecognitionResult {
  [index: number]: { transcript: string }
  isFinal: boolean
  length: number
}

interface SpeechRecognitionEvent {
  results: { [index: number]: SpeechRecognitionResult; length: number }
}

interface SpeechRecognition {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition
}

export default function BubbleInput() {
  const [text, setText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const addBubble = useBubbleStore((s) => s.addBubble)
  const selectBubble = useBubbleStore((s) => s.selectBubble)
  const bubbles = useBubbleStore((s) => s.bubbles)
  const { followUp } = useAiStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const triggerFollowUpRef = useRef<(bubbleId: string, content: string) => void>()
  triggerFollowUpRef.current = (bubbleId: string, content: string) => {
    const existingContents = bubbles.map((b) => b.content)
    useAiStore.setState({ activeFollowUpBubbleId: bubbleId })
    followUp(content, existingContents)
  }

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'zh-CN'

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const results = event.results
        const transcript = Array.from({ length: results.length }, (_, i) => results[i][0].transcript).join('')
        setText(transcript)
        if (event.results[0].isFinal) {
          if (transcript.trim()) {
            const id = addBubble(transcript.trim())
            selectBubble(id)
            triggerFollowUpRef.current?.(id, transcript.trim())
          }
          setText('')
          setIsListening(false)
        }
      }

      recognition.onerror = () => setIsListening(false)
      recognition.onend = () => setIsListening(false)
      recognitionRef.current = recognition
    }
  }, [addBubble, bubbles, selectBubble])

  const handleSubmit = () => {
    if (!text.trim()) return
    const id = addBubble(text.trim())
    selectBubble(id)
    triggerFollowUpRef.current?.(id, text.trim())
    setText('')
    inputRef.current?.focus()
  }

  const toggleVoice = () => {
    if (!recognitionRef.current) return
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  return (
    <div className="flex items-center gap-4 px-4 py-4">
      <div className="hidden lg:flex items-center gap-3 w-64 shrink-0">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white/70 ring-1 ring-white/70 shadow-glass">
          <img src="/aethel-logo-icon.png" alt="AetheL logo" className="h-[88%] w-[88%] object-contain" />
        </div>
        <div>
          <div className="text-[15px] font-semibold text-on-surface">AetheL</div>
          <div className="text-[11px] text-on-surface-variant">产品构思工作台</div>
        </div>
      </div>

      <div className="flex-1 relative">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="输入灵感，回车生成气泡..."
          className="w-full input-field h-14 rounded-full pr-12 text-[15px]"
        />
        {text && (
          <button
            onClick={handleSubmit}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-primary hover:text-primary-fixed-dim transition-colors"
          >
            <Send size={16} />
          </button>
        )}
      </div>

      <button
        onClick={toggleVoice}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
          isListening
            ? 'bg-error-container/60 text-error backdrop-blur-md border border-error/30 animate-breathe'
            : 'btn-glass w-12 h-12 !p-0 flex items-center justify-center'
        }`}
      >
        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
      </button>

      <button onClick={handleSubmit} className="btn-liquid h-12 flex items-center gap-2 px-5 sm:px-7">
        <Plus size={16} />
        <span className="hidden sm:inline">气泡</span>
      </button>
    </div>
  )
}
