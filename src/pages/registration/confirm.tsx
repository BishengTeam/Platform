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
  const [loading, setLoading] = useState(true)

  useLoad((options) => {
    const id = options?.order_id || ''
    setOrderId(id)
    if (id) {
      getOrderDetail(Number(id)).then(order => {
        setCertName((order as any).cert_name || (order as any).certName || '')
        setPrice((order as any).price || 0)
        setLoading(false)
      }).catch(() => {
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  })

  const handlePay = useCallback(async () => {
    if (!isAgreed || isPaying || isExpired || !orderId) return
    setIsPaying(true)

    try {
      const prepay = await prepayOrder(Number(orderId))

      if (prepay.timeStamp) {
        await Taro.requestPayment({
          timeStamp: prepay.timeStamp,
          nonceStr: prepay.nonceStr,
          package: prepay.package,
          signType: prepay.signType as 'MD5' | 'HMAC-SHA256',
          paySign: prepay.paySign,
        })
      }

      Taro.navigateTo({
        url: `/${ROUTES.PAYMENT_RESULT}?order_id=${orderId}&status=success&cert_name=${encodeURIComponent(certName)}&price=${price}`,
      })
    } catch (err: any) {
      setIsPaying(false)
      if (err?.errMsg?.includes('cancel')) return

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
            <Text style={{ textAlign: 'center', padding: '40px', color: '#999' }}>加载中...</Text>
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
            <Text style={{ textAlign: 'center', padding: '40px', color: '#999' }}>订单不存在</Text>
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
              <PriceRow label={STRINGS.FORM_PRICE_EXAM_FEE} value={price} size='lg' />
              <PriceRow label={STRINGS.FORM_PRICE_TOTAL} value={price} isTotal size='lg' />
            </View>
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
    </AuthGuard>
  )
}
