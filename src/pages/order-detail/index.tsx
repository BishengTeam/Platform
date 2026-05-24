import { useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { STRINGS } from '@/constants/strings'
import { getOrderDetail } from '@/services/dataService'
import type { OrderDetail } from '@/types'
import styles from './index.module.scss'

export default function OrderDetailPage() {
  const [detail, setDetail] = useState<OrderDetail | null>(null)

  useLoad((options) => {
    try {
      const id = (options.order_id as string) || (options.id as string) || '1'
      const data = getOrderDetail(id)
      setDetail(data)
    } catch (e) {
      console.error('[order-detail] useLoad error:', e)
    }
  })

  const handleCopy = (text: string) => {
    Taro.setClipboardData({
      data: text,
      success: () => {
        Taro.showToast({ title: STRINGS.ORDER_DETAIL_COPY_SUCCESS, icon: 'success', duration: 1500 })
      },
    })
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.ORDER_DETAIL_TITLE} shouldShowBack />

        {!detail ? (
          <EmptyState icon='file-text' title='订单不存在' description='未找到该订单信息' />
        ) : (
          <View className={styles.body}>
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

            <View className={styles.metaCard}>
              <View className={styles.metaRow}>
                <Text className={styles.metaLabel}>{STRINGS.ORDER_DETAIL_AMOUNT_PAID}</Text>
                <Text className={styles.metaValueHighlight}>¥{detail.amountPaid}</Text>
              </View>

              <View className={styles.metaRow}>
                <Text className={styles.metaLabel}>{STRINGS.ORDER_DETAIL_ORDER_ID}</Text>
                <View className={styles.metaValueWrap}>
                  <Text className={styles.metaValue}>{detail.orderId}</Text>
                  <View className={styles.copyBtn} onClick={() => handleCopy(detail.orderId)}>
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
