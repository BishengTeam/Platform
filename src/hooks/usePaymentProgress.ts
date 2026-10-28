import { useCallback, useEffect, useRef, useState } from 'react'
import { useDidHide, useDidShow } from '@tarojs/taro'
import { getOrderDetail } from '@/services/dataService'
import { offlinePaymentService } from '@/services/offlinePayment'
import { getAuthSessionId } from '@/utils/authState'
import { paymentProgress, type PaymentProgressSnapshot } from '@/utils/paymentProgress'

export function usePaymentProgress(orderId: number, enabled: boolean, sessionId: number) {
  const [snapshot, setSnapshot] = useState<(PaymentProgressSnapshot & { scope: string }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [visible, setVisible] = useState(true)
  const [now, setNow] = useState(() => Date.now())
  const request = useRef(0)
  const flight = useRef<Promise<void> | null>(null)
  const firstShow = useRef(true)
  const refreshedDeadline = useRef('')
  const refresh = useCallback((): Promise<void> => {
    if (!enabled || !orderId) return Promise.resolve()
    if (flight.current) return flight.current
    const version = ++request.current
    setRefreshing(true)
    const task = async () => {
      try {
        const order = await getOrderDetail(orderId, true)
        if (!order) throw new Error('订单不存在')
        let payment = null, detailError = ''
        if (order.paymentChannel === 'bank_transfer') {
          try { payment = await offlinePaymentService.detail(orderId, true) }
          catch { detailError = '付款详情更新失败，可刷新重试或前往订单查看。' }
        }
        if (version !== request.current || sessionId !== getAuthSessionId()) return
        setSnapshot({ order, payment, scope: `${sessionId}:${orderId}` }); setError(detailError); setNow(Date.now())
      } catch {
        if (version === request.current && sessionId === getAuthSessionId()) setError('进度更新失败，已加载的信息已保留，请刷新重试。')
      } finally {
        if (version === request.current) { flight.current = null; setRefreshing(false); setLoading(false) }
      }
    }
    flight.current = task()
    return flight.current
  }, [orderId, enabled, sessionId])
  useEffect(() => {
    request.current++; flight.current = null; refreshedDeadline.current = ''
    setSnapshot(null); setError(''); setLoading(Boolean(enabled && orderId)); setRefreshing(false)
    if (enabled && orderId) void refresh()
    return () => { request.current++; flight.current = null }
  }, [orderId, enabled, sessionId, refresh])
  useDidShow(() => {
    setVisible(true); setNow(Date.now())
    if (!firstShow.current) void refresh()
    firstShow.current = false
  })
  useDidHide(() => setVisible(false))
  const currentSnapshot = enabled && snapshot?.scope === `${sessionId}:${orderId}` ? snapshot : null
  const poll = currentSnapshot ? paymentProgress(currentSnapshot, now).poll : false
  useEffect(() => {
    if (!enabled || !visible || !poll) return
    const timer = setInterval(() => { void refresh() }, 30000)
    return () => clearInterval(timer)
  }, [enabled, visible, poll, refresh])
  const deadline = currentSnapshot?.payment && ['awaiting_proof', 'returned'].includes(currentSnapshot.payment.status) ? currentSnapshot.payment.deadline : null
  useEffect(() => {
    if (!enabled || !visible || !deadline) return
    const end = Date.parse(deadline)
    if (!Number.isFinite(end)) return
    const timer = setInterval(() => setNow(Date.now()), 30000)
    const boundary = setTimeout(() => {
      setNow(Date.now())
      if (Date.now() < end) return
      const key = `${orderId}:${deadline}`
      if (refreshedDeadline.current !== key) { refreshedDeadline.current = key; void refresh() }
    }, Math.min(2147483647, Math.max(0, end - Date.now())))
    return () => { clearInterval(timer); clearTimeout(boundary) }
  }, [enabled, visible, deadline, orderId, refresh])
  return { snapshot: currentSnapshot, loading, refreshing, error, now, refresh }
}
