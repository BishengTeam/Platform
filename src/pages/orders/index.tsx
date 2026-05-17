import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import { useRouter } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { TagFilter } from '@/components/TagFilter'
import { STRINGS } from '@/constants/strings'
import { getOrders } from '@/services/dataService'
import styles from './index.module.scss'

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  [STRINGS.ORDERS_STATUS_PENDING]: { color: '#FA8C16', bg: '#FFF7E6' },
  [STRINGS.ORDERS_STATUS_ENROLLED]: { color: '#1677FF', bg: '#F0F5FF' },
  [STRINGS.ORDERS_STATUS_CANCELLED]: { color: '#999999', bg: '#F5F5F5' },
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
    : getOrders().filter(o => o.status === activeTag)

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
                    <View
                      className={styles.badge}
                      style={{ background: statusCfg.bg }}
                    >
                      <Text
                        className={styles.badgeText}
                        style={{ color: statusCfg.color }}
                      >
                        {order.status}
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
