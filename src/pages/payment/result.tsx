import { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import { getOrderDetail } from '@/services/dataService'
import styles from './result.module.scss'

export default function ResultPage() {
  const [orderId, setOrderId] = useState('')
  const [status, setStatus] = useState('success')
  const [certName, setCertName] = useState('')
  const [price, setPrice] = useState('')
  const [orderDetail, setOrderDetail] = useState<any>(null)

  useLoad((options) => {
    setStatus((options.status as string) || 'success')
    setOrderId((options.order_id as string) || '')
    setCertName(options.cert_name ? decodeURIComponent(options.cert_name as string) : '')
    setPrice((options.price as string) || '')
  })

  useEffect(() => {
    if (!orderId) return
    getOrderDetail(orderId)
      .then((detail) => {
        if (detail) setOrderDetail(detail)
      })
      .catch(() => {})
  }, [orderId])

  const isSuccess = status === 'success'

  // 优先使用 API 返回的订单详情，fallback 到 URL 参数
  const displayOrderId = orderDetail?.orderId || orderId
  const displayCertName = orderDetail?.courseTitle || certName
  const displayPrice = orderDetail?.amountPaid || price

  const handleViewOrder = () => {
    Taro.navigateTo({ url: `/${ROUTES.ORDER_DETAIL}?order_id=${displayOrderId}` })
  }

  const handleRepay = () => {
    Taro.navigateBack()
  }

  const handleBackHome = () => {
    Taro.switchTab({ url: `/${ROUTES.INDEX}` })
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='' shouldShowBack={false} />

        <View className={styles.body}>
          <View className={isSuccess ? styles.successIcon : styles.failIcon}>
            <Text className={styles.iconText}>{isSuccess ? '✓' : '✕'}</Text>
          </View>

          <Text className={styles.title}>
            {isSuccess ? STRINGS.RESULT_SUCCESS_TITLE : STRINGS.RESULT_FAIL_TITLE}
          </Text>
          <Text className={styles.desc}>
            {isSuccess ? STRINGS.RESULT_SUCCESS_DESC : STRINGS.RESULT_FAIL_DESC}
          </Text>

          <View className={styles.orderCard}>
            <View className={styles.cardRow}>
              <Text className={styles.cardLabel}>{STRINGS.RESULT_ORDER_ID}</Text>
              <Text className={styles.cardValueSm}>{displayOrderId || '—'}</Text>
            </View>
            {displayCertName ? (
              <View className={styles.cardRow}>
                <Text className={styles.cardLabel}>{STRINGS.RESULT_CERT_PROJECT}</Text>
                <Text className={styles.cardValue}>{displayCertName}</Text>
              </View>
            ) : null}
            {displayPrice ? (
              <View className={styles.cardRow}>
                <Text className={styles.cardLabel}>{STRINGS.RESULT_PAID_AMOUNT}</Text>
                <Text className={styles.cardValuePrice}>¥{parseFloat(displayPrice).toFixed(2)}</Text>
              </View>
            ) : null}
          </View>

          <View className={styles.actions}>
            {isSuccess ? (
              <Button variant='gradient' size='lg' onClick={handleViewOrder} className={styles.actionBtn}>
                {STRINGS.RESULT_VIEW_ORDER}
              </Button>
            ) : (
              <>
                <Button variant='gradient' size='lg' onClick={handleRepay} className={styles.actionBtn}>
                  {STRINGS.RESULT_REPAY}
                </Button>
                <Button variant='secondary' size='lg' onClick={handleBackHome} className={styles.actionBtnSecondary}>
                  {STRINGS.RESULT_BACK_HOME}
                </Button>
              </>
            )}
          </View>
        </View>
      </View>
    </AuthGuard>
  )
}
