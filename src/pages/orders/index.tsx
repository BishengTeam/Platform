import { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { ROUTES } from '@/constants/routes'
import { STRINGS } from '@/constants/strings'
import { getOrders } from '@/services/dataService'
import type { Order } from '@/types'
import styles from './index.module.scss'

const STATUS_CONFIG: Record<string, { badgeClass: string; badgeTextClass: string; label: string }> = {
  pending: { badgeClass: styles.badgePending, badgeTextClass: styles.badgePendingText, label: STRINGS.ORDERS_STATUS_PENDING },
  paid: { badgeClass: styles.badgeEnrolled, badgeTextClass: styles.badgeEnrolledText, label: STRINGS.ORDERS_STATUS_PAID },
  completed: { badgeClass: styles.badgeEnrolled, badgeTextClass: styles.badgeEnrolledText, label: STRINGS.ORDERS_STATUS_COMPLETED },
  refunded: { badgeClass: styles.badgeCancelled, badgeTextClass: styles.badgeCancelledText, label: STRINGS.ORDERS_STATUS_REFUNDED },
  closed: { badgeClass: styles.badgeCancelled, badgeTextClass: styles.badgeCancelledText, label: STRINGS.ORDERS_STATUS_CLOSED },
}

const STATUS_FILTER_MAP: Record<string, string[]> = {
  [STRINGS.ORDERS_TAG_ALL]: [],
  [STRINGS.ORDERS_STATUS_PENDING]: ['pending'],
  [STRINGS.ORDERS_STATUS_PAID]: ['paid'],
  [STRINGS.ORDERS_STATUS_COMPLETED]: ['completed'],
  [STRINGS.ORDERS_STATUS_CLOSED]: ['refunded', 'closed'],
}

const TAG_KEYS = [
  STRINGS.ORDERS_TAG_ALL,
  STRINGS.ORDERS_STATUS_PENDING,
  STRINGS.ORDERS_STATUS_PAID,
  STRINGS.ORDERS_STATUS_COMPLETED,
  STRINGS.ORDERS_STATUS_CLOSED,
]

export default function OrdersPage() {
  const { params } = useRouter()
  const statusParam = params.status ? decodeURIComponent(params.status) : ''
  const initialTag = (statusParam && (TAG_KEYS as string[]).includes(statusParam))
    ? statusParam
    : STRINGS.ORDERS_TAG_ALL
  const [activeTag, setActiveTag] = useState<string>(initialTag)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    getOrders()
      .then(data => setOrders(data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [])

  const filteredOrders = activeTag === STRINGS.ORDERS_TAG_ALL
    ? orders
    : orders.filter(o => STATUS_FILTER_MAP[activeTag]?.includes(o.status))
  const activeIndex = Math.max((TAG_KEYS as string[]).indexOf(activeTag), 0)

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.ORDERS_TITLE} shouldShowBack />
        <View className={styles.body}>
          <View className={styles.tabs}>
            {TAG_KEYS.map((tag) => {
              const isActive = activeTag === tag
              return (
                <View
                  key={tag}
                  className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
                  onClick={() => setActiveTag(tag)}
                >
                  <View className={styles.tabInner}>
                    <Text className={styles.tabText}>{tag}</Text>
                  </View>
                </View>
              )
            })}
            <View
              className={styles.tabIndicator}
              style={{
                width: `calc((100% - 32px) / ${TAG_KEYS.length})`,
                transform: `translateX(${activeIndex * 100}%)`,
              }}
            />
          </View>

          <View className={styles.list}>
            {loading && <EmptyState title="订单加载中..." />}
            {!loading && loadError && <EmptyState title="订单加载失败，请稍后重试" />}
            {!loading && !loadError && filteredOrders.map(order => {
              const statusCfg = STATUS_CONFIG[order.status]
              return (
                <View
                  key={order.id}
                  className={styles.card}
                  onClick={() => Taro.navigateTo({
                    url: `/${ROUTES.ORDER_DETAIL}?order_id=${order.id}`,
                  })}
                >
                  <View className={styles.cardTop}>
                    <View className={styles.cardInfo}>
                      <Text className={styles.cardTitle}>{order.title}</Text>
                      <Text className={styles.cardDesc}>{order.description}</Text>
                    </View>
                    <Text className={styles.cardAmount}>{order.amount}</Text>
                  </View>
                  <View className={styles.cardBottom}>
                    <Text className={styles.cardDate}>{order.date}</Text>
                    {statusCfg && (
                      <View className={`${styles.badge} ${statusCfg.badgeClass}`}>
                        <Text className={`${styles.badgeText} ${statusCfg.badgeTextClass}`}>
                          {statusCfg.label}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )
            })}
            {!loading && !loadError && filteredOrders.length === 0 && <EmptyState title="暂无订单" />}
          </View>
        </View>
      </View>
    </AuthGuard>
  )
}
