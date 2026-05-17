import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import { useRouter } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { TagFilter } from '@/components/TagFilter'
import { STRINGS } from '@/constants/strings'
import { getOrders } from '@/services/dataService'
import styles from './index.module.scss'

const STATUS_CONFIG: Record<string, { badgeClass: string; badgeTextClass: string; label: string }> = {
  pending: { badgeClass: styles.badgePending, badgeTextClass: styles.badgePendingText, label: STRINGS.ORDERS_STATUS_PENDING },
  enrolled: { badgeClass: styles.badgeEnrolled, badgeTextClass: styles.badgeEnrolledText, label: STRINGS.ORDERS_STATUS_ENROLLED },
  cancelled: { badgeClass: styles.badgeCancelled, badgeTextClass: styles.badgeCancelledText, label: STRINGS.ORDERS_STATUS_CANCELLED },
}

const STATUS_DISPLAY_MAP: Record<string, string> = {
  [STRINGS.ORDERS_TAG_ALL]: STRINGS.ORDERS_TAG_ALL,
  [STRINGS.ORDERS_STATUS_PENDING]: 'pending',
  [STRINGS.ORDERS_STATUS_ENROLLED]: 'enrolled',
  [STRINGS.ORDERS_STATUS_CANCELLED]: 'cancelled',
}

const TAG_KEYS = [
  STRINGS.ORDERS_TAG_ALL,
  STRINGS.ORDERS_STATUS_PENDING,
  STRINGS.ORDERS_STATUS_ENROLLED,
  STRINGS.ORDERS_STATUS_CANCELLED,
]

export default function OrdersPage() {
  const { params } = useRouter()
  const statusParam = params.status ? decodeURIComponent(params.status) : ''
  const initialTag = (statusParam && (TAG_KEYS as string[]).includes(statusParam))
    ? statusParam
    : STRINGS.ORDERS_TAG_ALL
  const [activeTag, setActiveTag] = useState<string>(initialTag)

  const filteredOrders = activeTag === STRINGS.ORDERS_TAG_ALL
    ? getOrders()
    : getOrders().filter(o => o.status === STATUS_DISPLAY_MAP[activeTag])

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.ORDERS_TITLE} shouldShowBack />
        <View className={styles.body}>
          <TagFilter
            tags={[...TAG_KEYS]}
            activeTag={activeTag}
            onChange={setActiveTag}
            variant='underline'
          />

          <View className={styles.list}>
            {filteredOrders.map(order => {
              const statusCfg = STATUS_CONFIG[order.status]
              return (
                <View key={order.id} className={styles.card}>
                  <View className={styles.cardTop}>
                    <View className={styles.cardInfo}>
                      <Text className={styles.cardTitle}>{order.title}</Text>
                      <Text className={styles.cardDesc}>{order.description}</Text>
                    </View>
                    <Text className={styles.cardAmount}>
                      {order.amount || STRINGS.ORDERS_FREE}
                    </Text>
                  </View>
                  <View className={styles.cardBottom}>
                    <Text className={styles.cardDate}>{order.date}</Text>
                    <View className={`${styles.badge} ${statusCfg.badgeClass}`}>
                      <Text className={`${styles.badgeText} ${statusCfg.badgeTextClass}`}>
                        {statusCfg.label}
                      </Text>
                    </View>
                  </View>
                </View>
              )
            })}
          </View>
        </View>
      </View>
    </AuthGuard>
  )
}
