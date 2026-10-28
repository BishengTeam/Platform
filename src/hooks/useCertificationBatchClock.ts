import { useEffect, useRef, useState } from 'react'
import { useDidHide, useDidShow } from '@tarojs/taro'
import { nextCertificationTransition, type CertificationBatchWindow } from '../utils/certificationBatch.ts'

/** Refresh on return and at time boundaries. Never reset registration form fields here. */
export function useCertificationBatchClock(
  batches: readonly CertificationBatchWindow[],
  onRefresh: () => void | Promise<unknown>,
  enabled = true,
  deadlines: readonly (string | null | undefined)[] = [],
) {
  const [now, setNow] = useState(() => Date.now())
  const [visible, setVisible] = useState(true)
  const firstShow = useRef(true)
  const refreshRef = useRef(onRefresh)
  refreshRef.current = onRefresh
  const refresh = () => {
    void Promise.resolve().then(() => refreshRef.current()).catch(error => console.warn('[certification batch refresh]', error))
  }
  useDidShow(() => {
    setVisible(true)
    setNow(Date.now())
    if (enabled && !firstShow.current) refresh()
    firstShow.current = false
  })
  useDidHide(() => setVisible(false))
  const next = nextCertificationTransition(batches, now, deadlines)
  useEffect(() => {
    if (!enabled || !visible || next === null) return
    const timer = setTimeout(() => {
      const current = Date.now()
      setNow(current)
      if (current >= next) refresh()
    }, Math.min(2147483647, Math.max(0, next - Date.now() + 1)))
    return () => clearTimeout(timer)
  }, [enabled, visible, next, now])
  return now
}
