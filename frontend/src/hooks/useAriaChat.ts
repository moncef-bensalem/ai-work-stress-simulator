import { useCallback, useEffect, useRef, useState } from 'react'
import { api, type ChatMessage } from '../lib/api'
import { speakAria, stopAriaSpeech } from '../lib/ariaSpeech'
import { connectSocket, getSocket } from '../lib/socket'
import { usePreferences } from '../contexts/PreferencesContext'

export interface AriaState {
  messages: ChatMessage[]
  phase: string
  phaseLabel: string
  mode: string
  isTyping: boolean
  isConnected: boolean
  sendMessage: (content: string) => void
  loadHistory: () => Promise<void>
}

export function useAriaChat(sessionId: string | null): AriaState {
  const { preferences, t } = usePreferences()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [phase, setPhase] = useState('accueil')
  const [phaseLabel, setPhaseLabel] = useState<string>(t.phases.accueil)
  const [mode, setMode] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const joinedRef = useRef(false)
  const spokenIdsRef = useRef<Set<string>>(new Set())

  const getPhaseLabel = useCallback(
    (phaseKey: string) => t.phases[phaseKey as keyof typeof t.phases] ?? phaseKey,
    [t],
  )

  const speakMessage = useCallback(
    (msg: ChatMessage) => {
      if (msg.sender !== 'aria' || spokenIdsRef.current.has(msg.id)) return
      spokenIdsRef.current.add(msg.id)
      speakAria(msg.content, preferences.language, preferences.aria_volume)
    },
    [preferences.language, preferences.aria_volume],
  )

  const loadHistory = useCallback(async () => {
    if (!sessionId) return
    try {
      const data = await api.getMessages(sessionId)
      setMessages(data.messages)
      setPhase(data.phase)
      setPhaseLabel(getPhaseLabel(data.phase))
      setMode(data.mode)
      data.messages.forEach((msg) => spokenIdsRef.current.add(msg.id))
    } catch {
      // silently ignore; socket will provide updates
    }
  }, [sessionId, getPhaseLabel])

  useEffect(() => {
    if (!sessionId) return

    const socket = connectSocket()
    joinedRef.current = false
    spokenIdsRef.current.clear()

    const onConnect = () => {
      setIsConnected(true)
      if (!joinedRef.current) {
        socket.emit('join_session', { session_id: sessionId })
        joinedRef.current = true
      }
    }

    const onDisconnect = () => {
      setIsConnected(false)
      joinedRef.current = false
    }

    const onAriaMessage = (msg: ChatMessage) => {
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === msg.id)
        return exists ? prev : [...prev, msg]
      })
      speakMessage(msg)
    }

    const onUserMessage = (msg: ChatMessage) => {
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === msg.id)
        return exists ? prev : [...prev, msg]
      })
    }

    const onTyping = (data: { typing: boolean }) => {
      setIsTyping(data.typing)
    }

    const onPhaseChange = (data: { phase: string; label: string }) => {
      setPhase(data.phase)
      setPhaseLabel(getPhaseLabel(data.phase))
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('aria_message', onAriaMessage)
    socket.on('user_message', onUserMessage)
    socket.on('aria_typing', onTyping)
    socket.on('session_phase_change', onPhaseChange)

    if (socket.connected) onConnect()

    loadHistory()

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('aria_message', onAriaMessage)
      socket.off('user_message', onUserMessage)
      socket.off('aria_typing', onTyping)
      socket.off('session_phase_change', onPhaseChange)
      stopAriaSpeech()
    }
  }, [sessionId, loadHistory, getPhaseLabel, speakMessage])

  useEffect(() => {
    setPhaseLabel(getPhaseLabel(phase))
  }, [phase, getPhaseLabel, preferences.language])

  const sendMessage = useCallback(
    (content: string) => {
      if (!sessionId || !content.trim()) return
      const socket = getSocket()
      const token = localStorage.getItem('access_token') ?? ''
      socket.emit('user_message', {
        session_id: sessionId,
        content: content.trim(),
        token,
      })
    },
    [sessionId],
  )

  return { messages, phase, phaseLabel, mode, isTyping, isConnected, sendMessage, loadHistory }
}
