import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow, useLoad, usePullDownRefresh } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { cancelOrder, getOrderDetail, prepayOrder } from '@/services/dataService'
import { orderKindLabel } from '@/services/orderMapper'
import { safeNavigateBack } from '@/utils/navigation'
import type { OrderDetail } from '@/types'
import styles from './index.module.scss'

const STATUS_CONFIG: Record<string, { text: string; color: string }> = {
  pending: { text: '待支付', color: '#fa8c16' },
  paid: { text: '已支付', color: '#52c41a' },
  completed: { text: '已完成', color: '#1677ff' },
  refunded: { text: '已退款', color: '#999' },
  closed: { text: '已关闭', color: '#999' },
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function OrderDetailPage() {
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [remaining, setRemaining] = useState(0)
  const [paying, setPaying] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const orderIdRef = useRef(0)
  const skipInitialShowRef = useRef(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadOrder = useCallback((id: number) => {
    return getOrderDetail(id).then(data => {
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
      orderIdRef.current = id
      void loadOrder(id)
    } catch {
      setLoading(false)
    }
  })

  useDidShow(() => {
    if (skipInitialShowRef.current) {
      skipInitialShowRef.current = false
      return
    }
    if (orderIdRef.current) void loadOrder(orderIdRef.current)
  })

  usePullDownRefresh(async () => {
    if (orderIdRef.current) await loadOrder(orderIdRef.current)
    Taro.stopPullDownRefresh()
  })

  useEffect(() => {
    if (detail?.status === 'pending' && detail.expiresAt) {
      startCountdown(detail.expiresAt)
    }
    return clearTimer
  }, [detail, startCountdown, clearTimer])

  const isExpired = detail?.status === 'pending' && Boolean(detail.expiresAt) && remaining <= 0

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
        setTimeout(() => void loadOrder(detail.numericId), 1000)
      }
    } catch (err) {
      if ((err as { errMsg?: string })?.errMsg?.includes('cancel')) return
      Taro.showToast({
        title: err instanceof Error ? err.message : '支付失败，请重试',
        icon: 'none',
        duration: 3000,
      })
    } finally {
      setPaying(false)
    }
  }

  const handleCancel = async () => {
    if (!detail || cancelling) return
    const confirmed = await new Promise<boolean>((resolve) => {
      Taro.showModal({
        title: '取消订单',
        content: '确定要取消此订单吗？取消后需重新下单。',
        confirmText: '取消订单',
        cancelText: '再想想',
        success: (res) => resolve(Boolean(res.confirm)),
        fail: () => resolve(false),
      })
    })
    if (!confirmed) return

    setCancelling(true)
    try {
      const closed = await cancelOrder(detail.numericId)
      setDetail(closed)
      Taro.showToast({ title: '订单已取消', icon: 'success' })
      setTimeout(() => {
        void safeNavigateBack({ fallbackUrl: '/pages/orders/index' })
      }, 1500)
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '取消订单失败，请重试',
        icon: 'none',
        duration: 3000,
      })
    } finally {
      setCancelling(false)
    }
  }

  const handleCopy = (text: string) => {
    Taro.setClipboardData({
      data: text,
      success: () => {
        Taro.showToast({ title: '已复制', icon: 'success', duration: 1500 })
      },
    })
  }

  const statusCfg = detail ? STATUS_CONFIG[detail.status] : null
  const isPending = detail?.status === 'pending' && !isExpired
  const orderNo = detail?.outTradeNo || detail?.orderId || ''
  const hasDiscount = detail ? Number(detail.discountAmount) > 0 : false
  const totalPrice = detail
    ? (hasDiscount ? detail.originalAmount : detail.amountPaid)
    : '0.00'

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='订单详情' shouldShowBack />

        {loading ? (
          <View className={styles.body}>
            <Text style={{ textAlign: 'center', padding: '40px', color: '#999' }}>加载中...</Text>
          </View>
        ) : !detail ? (
          <EmptyState icon='file-text' title='订单不存在' description='未找到该订单信息' />
        ) : (
          <>
            <View className={styles.body}>
              {/* 状态头部 */}
              {isPending ? (
                <View className={styles.payHeader}>
                  <Text className={styles.payTitle}>等待付款</Text>
                  <Text className={styles.payCountdown}>
                    {detail.expiresAt ? (
                      <>
                        还剩{' '}
                        <Text className={`${styles.payCountdownTime} ${remaining < 5 * 60 * 1000 ? styles.payCountdownTimeUrgent : ''}`}>
                          {formatCountdown(remaining)}
                        </Text>{' '}
                        订单自动取消
                      </>
                    ) : '请在订单有效期内完成支付'}
                  </Text>
                </View>
              ) : (
                <View className={styles.statusHeader}>
                  <Text className={styles.statusText} style={{ color: statusCfg?.color || '#333' }}>
                    {isExpired ? '订单已过期' : statusCfg?.text || detail.status}
                  </Text>
                </View>
              )}

              {/* 商品信息 */}
              <View className={styles.sectionCard}>
                <Text className={styles.sectionTitle}>商品信息</Text>
                <View className={styles.goodsRow}>
                  <View className={styles.goodsInfo}>
                    <Text className={styles.goodsName}>{detail.productTitle}</Text>
                    <Text className={styles.goodsDesc}>{detail.productDescription}</Text>
                    <Text className={styles.goodsDesc}>
                      {orderKindLabel(detail.orderKind)} · {detail.productType}
                    </Text>
                  </View>
                </View>
              </View>

              {/* 商品总价 */}
              <View className={styles.sectionCard}>
                <Text className={styles.sectionTitle}>商品总价</Text>
                <View className={styles.priceRow}>
                  <Text className={styles.priceLabel}>商品总价</Text>
                  <Text className={styles.priceValue}>¥{totalPrice}</Text>
                </View>
                {hasDiscount && (
                  <View className={styles.priceRow}>
                    <Text className={styles.priceLabel}>优惠券优惠</Text>
                    <Text className={styles.priceValueDiscount}>-¥{detail.discountAmount}</Text>
                  </View>
                )}
                <View className={styles.priceRow}>
                  <Text className={styles.priceLabel}>实付款</Text>
                  <Text className={styles.priceValue}>¥{detail.amountPaid}</Text>
                </View>
              </View>

              {/* 订单信息 */}
              <View className={styles.sectionCard}>
                <Text className={styles.sectionTitle}>订单信息</Text>
                <View className={styles.infoRow}>
                  <Text className={styles.infoLabel}>订单编号</Text>
                  <View className={styles.infoValueWrap}>
                    <Text className={styles.infoValue}>{orderNo}</Text>
                    <View className={styles.copyBtn} onClick={() => handleCopy(orderNo)}>
                      <Text className={styles.copyBtnText}>复制</Text>
                    </View>
                  </View>
                </View>
                <View className={styles.infoRow}>
                  <Text className={styles.infoLabel}>支付方式</Text>
                  <Text className={styles.infoValue}>{detail.paymentMethod}</Text>
                </View>
                <View className={styles.infoRow}>
                  <Text className={styles.infoLabel}>支付时间</Text>
                  <Text className={styles.infoValue}>{detail.paymentTime}</Text>
                </View>
                {detail.transactionId && (
                  <View className={styles.infoRow}>
                    <Text className={styles.infoLabel}>微信交易号</Text>
                    <Text className={styles.infoValue}>{detail.transactionId}</Text>
                  </View>
                )}
                <View className={styles.infoRow}>
                  <Text className={styles.infoLabel}>下单时间</Text>
                  <Text className={styles.infoValue}>{detail.orderTime}</Text>
                </View>
                {detail.closedAt && (
                  <View className={styles.infoRow}>
                    <Text className={styles.infoLabel}>关闭时间</Text>
                    <Text className={styles.infoValue}>{detail.closedAt}</Text>
                  </View>
                )}
                {detail.closeReason && (
                  <View className={styles.infoRow}>
                    <Text className={styles.infoLabel}>关闭原因</Text>
                    <Text className={styles.infoValue}>{detail.closeReason}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* 底部操作栏 */}
            {isPending && (
              <View className={styles.bottomBar}>
                <View className={styles.cancelBtn} onClick={handleCancel}>
                  <Text>{cancelling ? '取消中...' : '取消订单'}</Text>
                </View>
                <View
                  className={`${styles.payBtn} ${paying || cancelling ? styles.payBtnDisabled : ''}`}
                  onClick={handlePay}
                >
                  <Text>{paying ? '支付中...' : '立即支付'}</Text>
                </View>
              </View>
            )}
          </>
        )}
      </View>
    </AuthGuard>
  )
}
