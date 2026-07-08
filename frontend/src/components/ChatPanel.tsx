import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../lib/api'
import { usePreferences } from '../contexts/PreferencesContext'

interface ChatPanelProps {
  messages: ChatMessage[]
  phase: string
  phaseLabel: string
  isTyping: boolean
  isConnected: boolean
  onSend: (content: string) => void
}

const PHASE_COLORS: Record<string, string> = {
  accueil: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  pression: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  pic: 'bg-red-500/20 text-red-300 border-red-500/30',
  debriefing: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
}

export default function ChatPanel({
  messages,
  phase,
  phaseLabel,
  isTyping,
  isConnected,
  onSend,
}: ChatPanelProps) {
  const { t } = usePreferences()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    onSend(input)
    setInput('')
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-3 border-b border-theme shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-violet-400">ARIA</p>
            <p className="text-xs text-theme-muted">{t.chat.manager}</p>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full border ${PHASE_COLORS[phase] ?? 'bg-slate-500/20 text-slate-300'}`}
          >
            {phaseLabel}
          </span>
        </div>
        <p className={`text-xs mt-1 ${isConnected ? 'text-emerald-500' : 'text-red-400'}`}>
          {isConnected ? `● ${t.chat.connected}` : `○ ${t.chat.disconnected}`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                msg.sender === 'user'
                  ? 'bg-violet-600 text-white'
                  : 'bg-theme-card text-theme border border-theme'
              }`}
            >
              {msg.sender === 'aria' && (
                <p className="text-xs text-violet-400 mb-1 font-medium">ARIA</p>
              )}
              {msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-theme-card border border-theme rounded-xl px-4 py-2 text-sm text-theme-muted">
              {t.chat.typing}
              <span className="animate-pulse">...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-theme shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.chat.placeholder}
            className="flex-1 px-3 py-2 text-sm rounded-lg bg-theme-card border border-theme text-theme placeholder:text-theme-muted"
            disabled={!isConnected}
          />
          <button
            type="submit"
            disabled={!isConnected || !input.trim()}
            className="px-3 py-2 text-sm rounded-lg bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40"
          >
            {t.chat.send}
          </button>
        </div>
      </form>
    </div>
  )
}
