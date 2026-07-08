import { useEffect, useRef } from 'react'
import type { AssignedTask } from '../lib/api'
import { useNotifications } from '../contexts/NotificationContext'

export function useTaskSocket(options: {
  onTaskUpdate?: (task: AssignedTask, event: string) => void
  enabled?: boolean
}) {
  const { onTaskUpdate, enabled = true } = options
  const { setTaskUpdateHandler } = useNotifications()
  const onTaskUpdateRef = useRef(onTaskUpdate)
  onTaskUpdateRef.current = onTaskUpdate

  useEffect(() => {
    if (!enabled || !onTaskUpdateRef.current) {
      setTaskUpdateHandler(undefined)
      return
    }

    setTaskUpdateHandler((task, event) => {
      onTaskUpdateRef.current?.(task, event)
    })

    return () => setTaskUpdateHandler(undefined)
  }, [enabled, setTaskUpdateHandler])
}
