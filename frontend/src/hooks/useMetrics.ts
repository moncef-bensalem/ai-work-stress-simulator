import { useCallback, useEffect, useState } from 'react'
import { api, type SessionMetrics } from '../lib/api'
import { connectSocket, getSocket } from '../lib/socket'

export function useMetrics(sessionId: string | null) {
  const [metrics, setMetrics] = useState<SessionMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!sessionId) return
    try {
      const data = await api.getMetrics(sessionId)
      setMetrics(data)
    } catch {
      // keep last known metrics
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) return

    refresh()
    const interval = setInterval(refresh, 8000)
    const socket = connectSocket()

    const onMetrics = (payload: SessionMetrics) => {
      if (payload.session_id === sessionId) {
        setMetrics(payload)
      }
    }

    socket.on('metrics_update', onMetrics)

    return () => {
      clearInterval(interval)
      getSocket().off('metrics_update', onMetrics)
    }
  }, [sessionId, refresh])

  return { metrics, loading, refresh }
}
