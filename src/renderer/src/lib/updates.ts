import { useEffect, useState } from 'react'
import type { UpdateStatus } from '@shared/updates'

/** Estado de actualización en vivo (lo envía el proceso principal). */
export function useUpdateStatus(): UpdateStatus {
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })
  useEffect(() => {
    let alive = true
    window.api.getUpdateStatus().then((s) => alive && setStatus(s)).catch(() => undefined)
    const off = window.api.onUpdateStatus(setStatus)
    return () => {
      alive = false
      off()
    }
  }, [])
  return status
}
