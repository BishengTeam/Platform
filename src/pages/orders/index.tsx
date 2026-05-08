import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { STRINGS } from '@/constants/strings'
import { getOrders } from '@/services/dataService'
import styles from './index.module.scss'

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  '待付款': { color: '#FA8C16', bg: '#FFF7E6' },
  '已报名': { color: '#1677FF', bg: '#F0F5FF' },
  '已取消': { color: '#999999', bg: '#F5F5F5' },
}

const TAG_KEYS = ['全部', '待付款', '已报名', '已取消'] as const

export default function OrdersPage() {
  const { params } = useRouter()
  const statusParam = params.status ? decodeURIComponent(params.status) : ''
  const initialTag = (statusParam && TAG_KEYS.includes(statusParam as typeof TAG_KEYS[number]))
    ? statusParam
    : '全部'
  const [activeTag, setActiveTag] = useState<string>(initialTag)

  const filteredOrders = activeTag === '全部'
    ? getOrders()
    : getOrders().filter(o => o.status === activeTag)

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.ORDERS_TITLE} showBack />
        <View className={styles.body}>
          <View className={styles.tabs}>
            {TAG_KEYS.map(tag => (
              <View
                key={tag}
                className={`${styles.tab} ${activeTag === tag ? styles.tabActive : ''}`}
                onClick={() => setActiveTag(tag)}
              >
                <Text
                  className={styles.tabText}
                  style={{ color: activeTag === tag ? '#1677FF' : '#666666' }}
                >
                  {tag}
                </Text>
                {activeTag === tag && <View className={styles.tabIndicator} />}
              </View>
            ))}
          </View>

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
                      {order.amount || '免费'}
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
