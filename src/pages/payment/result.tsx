import { useState, useMemo } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import styles from './result.module.scss'

function SuccessIcon() {
  return (
    <View className={styles.successIcon}>
      <Text className={styles.checkmark}>✓</Text>
    </View>
  )
}

function FailIcon() {
  return (
    <View className={styles.failIcon}>
      <Text className={styles.cross}>✕</Text>
    </View>
  )
}

export default function ResultPage() {
  const [orderId, setOrderId] = useState('')
  const [status, setStatus] = useState('success')

  useLoad((options) => {
    setStatus((options.status as string) || 'success')
    setOrderId((options.order_id as string) || '')
  })

  const isSuccess = status === 'success'

  const handleViewOrder = () => {
    Taro.navigateTo({ url: `/${ROUTES.ORDERS}?status=${STRINGS.ORDERS_STATUS_PENDING}` })
  }

  const handleRepay = () => {
    Taro.navigateBack()
  }

  const handleBackHome = () => {
    Taro.switchTab({ url: `/${ROUTES.INDEX}` })
  }

  const actionButtons = useMemo(() => {
    if (isSuccess) {
      return (
        <Button variant='gradient' size='lg' onClick={handleViewOrder} className={styles.actionBtn}>
          {STRINGS.RESULT_VIEW_ORDER}
        </Button>
      )
    }
    return (
      <>
        <Button variant='gradient' size='lg' onClick={handleRepay} className={styles.actionBtn}>
          {STRINGS.RESULT_REPAY}
        </Button>
        <Button variant='secondary' size='lg' onClick={handleBackHome} className={styles.actionBtn}>
          {STRINGS.RESULT_BACK_HOME}
        </Button>
      </>
    )
  }, [isSuccess])

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='' shouldShowBack={false} />

        <View className={styles.body}>
          <EmptyState
            iconNode={isSuccess ? <SuccessIcon /> : <FailIcon />}
            title={isSuccess ? STRINGS.RESULT_SUCCESS_TITLE : STRINGS.RESULT_FAIL_TITLE}
            description={isSuccess ? STRINGS.RESULT_SUCCESS_DESC : STRINGS.RESULT_FAIL_DESC}
          >
            {orderId ? (
              <Text className={styles.orderId}>{STRINGS.RESULT_ORDER_ID_PREFIX}{orderId}</Text>
            ) : null}
            {actionButtons}
          </EmptyState>
        </View>
      </View>
    </AuthGuard>
  )
}
