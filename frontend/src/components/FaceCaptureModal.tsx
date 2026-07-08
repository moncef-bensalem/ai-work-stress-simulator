import { useCallback, useEffect, useRef, useState } from 'react'
import { usePreferences } from '../contexts/PreferencesContext'
import Button from './ui/Button'
import { detectFaceDescriptor, loadFaceModels, startCamera, stopCamera } from '../lib/faceRecognition'

type FaceCaptureModalProps = {
  open: boolean
  mode: 'login' | 'register'
  onClose: () => void
  onCapture: (descriptor: number[]) => Promise<void>
}

export default function FaceCaptureModal({ open, mode, onClose, onCapture }: FaceCaptureModalProps) {
  const { t } = usePreferences()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<string>(t.face.initCamera)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  const cleanup = useCallback(() => {
    stopCamera(streamRef.current)
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  useEffect(() => {
    if (!open) {
      cleanup()
      setReady(false)
      setLoading(false)
      return
    }

    let cancelled = false

    const init = async () => {
      try {
        setStatus(t.face.loadingModel)
        await loadFaceModels()
        if (cancelled || !videoRef.current) return

        setStatus(t.face.cameraAccess)
        streamRef.current = await startCamera(videoRef.current)
        if (cancelled) {
          cleanup()
          return
        }

        setReady(true)
        setStatus(mode === 'register' ? t.face.registerHint : t.face.loginHint)
      } catch {
        if (!cancelled) {
          setStatus(t.face.cameraError)
          setReady(false)
        }
      }
    }

    init()
    return () => {
      cancelled = true
      cleanup()
    }
  }, [open, mode, cleanup, t.face])

  const handleCapture = async () => {
    if (!videoRef.current || !ready) return
    setLoading(true)
    setStatus(t.face.analyzing)

    try {
      const descriptor = await detectFaceDescriptor(videoRef.current)
      if (!descriptor) {
        setStatus(t.face.noFace)
        return
      }

      await onCapture(descriptor)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : t.face.captureError)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md glass-card p-6 space-y-4 animate-fade-up">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-theme">
              {mode === 'register' ? t.face.registerTitle : t.face.loginTitle}
            </h2>
            <p className="text-sm text-theme-muted mt-1">{status}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-theme-muted hover:text-theme text-xl leading-none"
            aria-label={t.face.close}
          >
            ×
          </button>
        </div>

        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 border border-theme">
          <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" playsInline muted />
          <div className="pointer-events-none absolute inset-8 border-2 border-cyan-400/60 rounded-[40%] shadow-[inset_0_0_40px_rgba(34,211,238,0.15)]" />
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose} disabled={loading}>
            {t.face.cancel}
          </Button>
          <Button type="button" className="flex-1" onClick={handleCapture} loading={loading} disabled={!ready}>
            {mode === 'register' ? t.face.register : t.face.login}
          </Button>
        </div>
      </div>
    </div>
  )
}
