import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { PriceRow } from '@/components/PriceRow'
import { Button } from '@/components/Button'
import { AgreementCheckbox } from '@/components/AgreementCheckbox'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import { getOrderDetail, prepayOrder } from '@/services/dataService'
import { pointsMallService, applyCouponToOrder } from '@/services/pointsMallService'
import type { UsableCoupon } from '@/services/pointsMallService'
import styles from './confirm.module.scss'
const COUNTDOWN_SECONDS = 30 * 60

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function ConfirmPage() {
  const [isAgreed, setIsAgreed] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isExpired = remaining <= 0

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const [orderId, setOrderId] = useState('')
  const [certName, setCertName] = useState('')
  const [price, setPrice] = useState(0)
  const [originalPrice, setOriginalPrice] = useState(0)
  const [usableCoupons, setUsableCoupons] = useState<UsableCoupon[]>([])
  const [selectedCoupon, setSelectedCoupon] = useState<UsableCoupon | null>(null)
  const [couponSheetOpen, setCouponSheetOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useLoad((options) => {
    const id = options?.order_id || ''
    setOrderId(id)
    if (id) {
      getOrderDetail(Number(id)).then(order => {
        // getOrderDetail 已通过 toOrderDetail 映射为 OrderDetail 类型，amountPaid 为元
        setCertName(order?.courseTitle || '')
        setPrice(order?.amountPaid ? parseFloat(order.amountPaid) : 0)
        setLoading(false)
      }).catch(() => {
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  })

  const handleSelectCoupon = useCallback(async (coupon: UsableCoupon | null) => {
    try {
      const result = await applyCouponToOrder(Number(orderId), coupon?.coupon_code || '')
      setPrice(result.final_price / 100)
      setOriginalPrice(result.original_price / 100)
      setSelectedCoupon(coupon)
      setCouponSheetOpen(false)
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '应用优惠券失败',
        icon: 'none',
        duration: 3000,
      })
    }
  }, [orderId])

  const handlePay = useCallback(async () => {
    if (!isAgreed || isPaying || isExpired || !orderId) return
    setIsPaying(true)

    try {
      const prepay = await prepayOrder(Number(orderId))

      // prepayOrder 返回 snake_case 字段（后端原始风格）
      if (prepay.time_stamp) {
        await Taro.requestPayment({
          timeStamp: prepay.time_stamp,
          nonceStr: prepay.nonce_str,
          package: prepay.package,
          signType: prepay.sign_type as 'MD5' | 'HMAC-SHA256',
          paySign: prepay.pay_sign,
        })
      }

      Taro.navigateTo({
        url: `/${ROUTES.PAYMENT_RESULT}?order_id=${orderId}&status=success&cert_name=${encodeURIComponent(certName)}&price=${price}`,
      })
    } catch (err: unknown) {
      setIsPaying(false)
      if ((err as { errMsg?: string })?.errMsg?.includes('cancel')) return

      Taro.navigateTo({
        url: `/${ROUTES.PAYMENT_RESULT}?order_id=${orderId}&status=fail&cert_name=${encodeURIComponent(certName)}&price=${price}`,
      })
    }
  }, [isAgreed, isPaying, isExpired, orderId, certName, price])

  const timeText = formatTime(remaining)

  if (loading) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.CONFIRM_TITLE} shouldShowBack />
          <View className={styles.body}>
            <Text className={styles.emptyState}>{STRINGS.CONFIRM_LOADING}</Text>
          </View>
        </View>
      </AuthGuard>
    )
  }

  if (!orderId) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.CONFIRM_TITLE} shouldShowBack />
          <View className={styles.body}>
            <Text className={styles.emptyState}>{STRINGS.CONFIRM_ORDER_NOT_FOUND}</Text>
          </View>
        </View>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.CONFIRM_TITLE} shouldShowBack />

        <View className={styles.body}>
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>{STRINGS.CONFIRM_ORDER_INFO}</Text>
            <View className={styles.card}>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>{STRINGS.CONFIRM_CERT_NAME}</Text>
                <Text className={styles.infoValue}>{certName}</Text>
              </View>
            </View>
          </View>

          <View className={styles.section}>
            <Text className={styles.sectionTitle}>{STRINGS.FORM_PRICE_DETAIL}</Text>
            <View className={styles.card}>
              <PriceRow label={STRINGS.FORM_PRICE_EXAM_FEE} value={originalPrice > 0 ? originalPrice : price} size='lg' />
              {selectedCoupon && (
                <PriceRow label="优惠券折扣" value={-(originalPrice - price)} size='lg' />
              )}
              <PriceRow label={STRINGS.FORM_PRICE_TOTAL} value={price} isTotal size='lg' />
            </View>
            {usableCoupons.length > 0 && (
              <View
                className={styles.card}
                style={{ marginTop: '12px', cursor: 'pointer' }}
                onClick={() => setCouponSheetOpen(true)}
              >
                <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                  <Text style={{ fontSize: '28rpx', color: '#667085' }}>优惠券</Text>
                  <Text style={{ fontSize: '28rpx', color: selectedCoupon ? '#ef4444' : '#3366ff', fontWeight: 600 }}>
                    {selectedCoupon
                      ? `-${(originalPrice - price).toFixed(2)}元`
                      : `${usableCoupons.length}张可用`}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View className={styles.section}>
            <Text className={styles.sectionTitle}>{STRINGS.CONFIRM_PAYMENT_METHOD}</Text>
            <View className={styles.paymentCard}>
              <View className={styles.paymentLeft}>
                <View className={styles.wechatIcon}>W</View>
                <Text className={styles.paymentLabel}>{STRINGS.CONFIRM_PAYMENT_WECHAT}</Text>
              </View>
              <View className={styles.radioOuter}>
                <View className={styles.radioInner} />
              </View>
            </View>
          </View>
        </View>

        <View className={styles.bottomBar}>
          <View className={styles.countdownRow}>
            {isExpired ? (
              <Text className={styles.countdownExpired}>{STRINGS.CONFIRM_COUNTDOWN_EXPIRED}</Text>
            ) : (
              <Text className={styles.countdownText}>
                {STRINGS.CONFIRM_COUNTDOWN_PREFIX}
                <Text className={styles.countdownTime}>{timeText}</Text>
                {STRINGS.CONFIRM_COUNTDOWN_SUFFIX}
              </Text>
            )}
          </View>

          <Button
            variant='gradient'
            size='lg'
            onClick={handlePay}
            className={`${styles.payBtn} ${isAgreed && !isPaying && !isExpired ? '' : styles.payBtnDisabled}`}
          >
            {isExpired
              ? STRINGS.CONFIRM_COUNTDOWN_EXPIRED
              : isPaying
                ? STRINGS.CONFIRM_PAYING
                : `${STRINGS.CONFIRM_PAY_BUTTON} ¥${price.toFixed(2)}`}
          </Button>

          <AgreementCheckbox agreed={isAgreed} onChange={setIsAgreed}>
            {STRINGS.CONFIRM_AGREEMENT_PREFIX}
            <Text className={styles.link}>{STRINGS.CONFIRM_AGREEMENT_TERMS}</Text>
            {STRINGS.AUTH_AGREEMENT_AND}
            <Text className={styles.link}>{STRINGS.CONFIRM_AGREEMENT_PRIVACY}</Text>
          </AgreementCheckbox>
        </View>
      </View>

        {couponSheetOpen && (
          <View
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'flex-end',
            }}
            onClick={() => setCouponSheetOpen(false)}
          >
            <View
              style={{
                width: '100%', maxHeight: '60vh', overflowY: 'auto',
                background: '#fff', borderRadius: '32px 32px 0 0',
                padding: '32px 32px calc(32px + env(safe-area-inset-bottom))',
                boxSizing: 'border-box',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <View style={{ width: '72px', height: '8px', borderRadius: '8px', background: '#E0E0E0', margin: '0 auto 24px' }} onClick={() => setCouponSheetOpen(false)} />
              <Text style={{ display: 'block', textAlign: 'center', fontSize: '34rpx', fontWeight: 700, color: '#17233d', marginBottom: '24px' }}>选择优惠券</Text>
              <View
                style={{
                  padding: '20px', borderRadius: '16px',
                  border: !selectedCoupon ? '2px solid #3366ff' : '2px solid #f2f4f7',
                  marginBottom: '16px',
                  background: !selectedCoupon ? '#f0f7ff' : '#fff',
                }}
                onClick={() => handleSelectCoupon(null)}
              >
                <Text style={{ fontSize: '28rpx', fontWeight: 600, color: '#17233d' }}>不使用优惠券</Text>
              </View>
              {usableCoupons.map((coupon) => (
                <View
                  key={coupon.id}
                  style={{
                    padding: '20px', borderRadius: '16px',
                    border: selectedCoupon?.id === coupon.id ? '2px solid #3366ff' : '2px solid #f2f4f7',
                    marginBottom: '16px',
                    background: selectedCoupon?.id === coupon.id ? '#f0f7ff' : '#fff',
                  }}
                  onClick={() => handleSelectCoupon(coupon)}
                >
                  <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: '30rpx', fontWeight: 700, color: '#17233d' }}>{coupon.name}</Text>
                    <Text style={{ fontSize: '28rpx', fontWeight: 700, color: '#ef4444' }}>{coupon.discount_label}</Text>
                  </View>
                  <Text style={{ display: 'block', marginTop: '8px', fontSize: '24rpx', color: '#98a2b3' }}>
                    {coupon.scope_label} · 满{(coupon.min_order_amount_cents / 100).toFixed(0)}元可用
                  </Text>
                  <Text style={{ display: 'block', marginTop: '4px', fontSize: '24rpx', color: '#98a2b3' }}>
                    券码 {coupon.coupon_code} · 有效期至 {coupon.expires_at.slice(0, 10)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
    </AuthGuard>
  )
}