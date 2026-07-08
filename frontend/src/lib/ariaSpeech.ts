import type { Language } from '../i18n/types'

const SPEECH_LANG: Record<Language, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  ar: 'ar-SA',
}

let voicesReady = false

function ensureVoicesLoaded() {
  if (voicesReady || !window.speechSynthesis) return
  window.speechSynthesis.getVoices()
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    voicesReady = true
  }, { once: true })
  voicesReady = true
}

function pickVoice(language: Language): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices() ?? []
  const prefix = SPEECH_LANG[language].split('-')[0]
  return (
    voices.find((v) => v.lang === SPEECH_LANG[language]) ??
    voices.find((v) => v.lang.startsWith(prefix)) ??
    voices.find((v) => v.default)
  )
}

export function isAriaSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function stopAriaSpeech() {
  window.speechSynthesis?.cancel()
}

export function speakAria(text: string, language: Language, volume: number) {
  if (!isAriaSpeechSupported() || volume <= 0 || !text.trim()) return

  ensureVoicesLoaded()
  stopAriaSpeech()

  const utterance = new SpeechSynthesisUtterance(text.trim())
  utterance.lang = SPEECH_LANG[language]
  utterance.volume = Math.min(1, Math.max(0, volume / 100))
  utterance.rate = language === 'ar' ? 0.9 : 0.95
  utterance.pitch = 1

  const voice = pickVoice(language)
  if (voice) utterance.voice = voice

  window.speechSynthesis.speak(utterance)
}
