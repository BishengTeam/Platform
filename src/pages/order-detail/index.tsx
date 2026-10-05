import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import { getOrderDetail, prepayOrder } from '@/services/dataService'
import type { OrderDetail } from '@/types'
import styles from './index.module.scss'

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  pending: { text: '待支付', color: '#fa8c16' },
  paid: { text: '已支付', color: '#52c41a' },
  completed: { text: '已完成', color: '#1677ff' },
  refunded: { text: '已退款', color: '#999' },
  closed: { text: '已关闭', color: '#999' },
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00'
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  const h = Math.floor(min / 60)
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export default function OrderDetailPage() {
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [remaining, setRemaining] = useState(0)
  const [paying, setPaying] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadOrder = useCallback((id: number) => {
    getOrderDetail(id).then(data => {
      setDetail(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startCountdown = useCallback((expiresAt: string | null) => {
    clearTimer()
    if (!expiresAt) return
    const endTime = new Date(expiresAt).getTime()
    if (Number.isNaN(endTime)) return
    setRemaining(endTime - Date.now())
    timerRef.current = setInterval(() => {
      const left = endTime - Date.now()
      setRemaining(left)
      if (left <= 0) clearTimer()
    }, 1000)
  }, [clearTimer])

  useLoad((options) => {
    try {
      const idStr = (options.order_id as string) || (options.id as string) || ''
      const id = Number(idStr)
      if (!idStr || !Number.isFinite(id)) {
        setLoading(false)
        return
      }
      loadOrder(id)
    } catch {
      setLoading(false)
    }
  })

  useEffect(() => {
    if (detail?.status === 'pending' && detail.expiresAt) {
      startCountdown(detail.expiresAt)
    }
    return clearTimer
  }, [detail, startCountdown, clearTimer])

  const isExpired = detail?.status === 'pending' && remaining <= 0

  const handlePay = async () => {
    if (!detail || paying || isExpired) return
    setPaying(true)
    try {
      const prepay = await prepayOrder(detail.numericId)
      if (prepay.time_stamp) {
        await Taro.requestPayment({
          timeStamp: prepay.time_stamp,
          nonceStr: prepay.nonce_str,
          package: prepay.package,
          signType: prepay.sign_type as 'MD5' | 'HMAC-SHA256',
          paySign: prepay.pay_sign,
        })
        Taro.showToast({ title: '支付成功', icon: 'success' })
        setTimeout(() => {
          loadOrder(detail.numericId)
        }, 1000)
      }
    } catch (err) {
      if ((err as { errMsg?: string })?.errMsg?.includes('cancel')) {
        // User cancelled payment
        return
      }
      Taro.showToast({
        title: err instanceof Error ? err.message : '支付失败，请重试',
        icon: 'none',
        duration: 3000,
      })
    } finally {
      setPaying(false)
    }
  }

  const handleCopy = (text: string) => {
    Taro.setClipboardData({
      data: text,
      success: () => {
        Taro.showToast({ title: STRINGS.ORDER_DETAIL_COPY_SUCCESS, icon: 'success', duration: 1500 })
      },
    })
  }

  const statusCfg = detail ? STATUS_LABELS[detail.status] : null
  const showPayBtn = detail?.status === 'pending' && !isExpired

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.ORDER_DETAIL_TITLE} shouldShowBack />

        {loading ? (
          <View className={styles.body}>
            <Text style={{ textAlign: 'center', padding: '40px', color: '#999' }}>加载中...</Text>
          </View>
        ) : !detail ? (
          <EmptyState icon='file-text' title='订单不存在' description='未找到该订单信息' />
        ) : (
          <View className={styles.body}>
            {/* Status card */}
            <View className={styles.metaCard} style={{ marginBottom: '24px' }}>
              {statusCfg && (
                <View style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '24px 0',
                }}>
                  <Text style={{
                    fontSize: '36rpx', fontWeight: 700, color: statusCfg.color,
                  }}>
                    {isExpired ? '订单已过期' : statusCfg.text}
                  </Text>
                </View>
              )}

              {showPayBtn && detail.expiresAt && (
                <View style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 0 20px',
                }}>
                  <Text style={{ fontSize: '26rpx', color: '#999', marginRight: '8px' }}>剩余支付时间</Text>
                  <Text style={{
                    fontSize: '32rpx', fontWeight: 700,
                    color: remaining < 5 * 60 * 1000 ? '#ef4444' : '#fa8c16',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {formatCountdown(remaining)}
                  </Text>
                </View>
              )}

              {showPayBtn && (
                <View style={{ padding: '0 32px 24px' }}>
                  <Button variant='gradient' size='lg' onClick={handlePay} disabled={paying}>
                    {paying ? '支付中...' : `立即支付 ¥${detail.amountPaid}`}
                  </Button>
                </View>
              )}
            </View>

            {/* Course info */}
            <View className={styles.courseCard}>
              <View className={styles.courseCover}>
                {detail.courseCover ? (
                  <Image className={styles.coverImg} src={detail.courseCover} mode='aspectFill' />
                ) : (
                  <View className={styles.coverPlaceholder}>
                    <Text className={styles.coverPlaceholderText}>{detail.courseTitle.slice(0, 1)}</Text>
                  </View>
                )}
              </View>
              <View className={styles.courseInfo}>
                <Text className={styles.courseTitle}>{detail.courseTitle}</Text>
                <Text className={styles.courseSubtitle}>{detail.courseSubtitle}</Text>
              </View>
            </View>

            {/* Order meta */}
            <View className={styles.metaCard}>
              <View className={styles.metaRow}>
                <Text className={styles.metaLabel}>{STRINGS.ORDER_DETAIL_AMOUNT_PAID}</Text>
                <Text className={styles.metaValueHighlight}>¥{detail.amountPaid}</Text>
              </View>

              <View className={styles.metaRow}>
                <Text className={styles.metaLabel}>{STRINGS.ORDER_DETAIL_ORDER_ID}</Text>
                <View className={styles.metaValueWrap}>
                  <Text className={styles.metaValue}>{detail.outTradeNo || detail.orderId}</Text>
                  <View className={styles.copyBtn} onClick={() => handleCopy(detail.outTradeNo || detail.orderId)}>
                    <Text className={styles.copyBtnText}>{STRINGS.ORDER_DETAIL_COPY}</Text>
                  </View>
                </View>
              </View>

              <View className={styles.metaRow}>
                <Text className={styles.metaLabel}>{STRINGS.ORDER_DETAIL_PAYMENT_METHOD}</Text>
                <Text className={styles.metaValue}>{detail.paymentMethod}</Text>
              </View>

              <View className={styles.metaRow}>
                <Text className={styles.metaLabel}>{STRINGS.ORDER_DETAIL_PAYMENT_TIME}</Text>
                <Text className={styles.metaValue}>{detail.paymentTime}</Text>
              </View>

              <View className={styles.metaRow}>
                <Text className={styles.metaLabel}>{STRINGS.ORDER_DETAIL_ORDER_TIME}</Text>
                <Text className={styles.metaValue}>{detail.orderTime}</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </AuthGuard>
  )
}
