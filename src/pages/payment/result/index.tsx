import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import styles from './index.module.scss'

export default function ResultPage() {
  const [orderId, setOrderId] = useState('')
  const [status, setStatus] = useState('success')

  useLoad((options) => {
    setStatus((options.status as string) || 'success')
    setOrderId((options.order_id as string) || '')
  })

  const isSuccess = status === 'success'

  const handleViewOrder = () => {
    Taro.navigateTo({ url: `/${ROUTES.ORDERS}?status=待付款` })
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
        <PageHeader title='' showBack={false} />

        <View className={styles.body}>
          {/* Status Icon */}
          <View className={styles.iconWrap}>
            {isSuccess ? (
              <View className={styles.successIcon}>
                <Text className={styles.checkmark}>✓</Text>
              </View>
            ) : (
              <View className={styles.failIcon}>
                <Text className={styles.cross}>✕</Text>
              </View>
            )}
          </View>

          <Text className={styles.title}>
            {isSuccess ? STRINGS.RESULT_SUCCESS_TITLE : STRINGS.RESULT_FAIL_TITLE}
          </Text>

          <Text className={styles.desc}>
            {isSuccess ? STRINGS.RESULT_SUCCESS_DESC : STRINGS.RESULT_FAIL_DESC}
          </Text>

          {orderId && (
            <Text className={styles.orderId}>订单编号：{orderId}</Text>
          )}

          {/* Actions */}
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
                <Button variant='secondary' size='lg' onClick={handleBackHome} className={styles.actionBtn}>
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
