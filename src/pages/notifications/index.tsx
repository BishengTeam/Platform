import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Icon } from '@/components/Icon'
import { STRINGS } from '@/constants/strings'
import { getNotifications } from '@/services/dataService'
import type { Notification } from '@/types'
import styles from './index.module.scss'

export default function NotificationsPage() {
  const [list, setList] = useState<Notification[]>(getNotifications())

  const handleRead = (id: string) => {
    setList(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    )
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.NOTIFICATIONS_TITLE} shouldShowBack />
        <View className={styles.body}>
          <View className={styles.list}>
            {list.map(item => (
              <View
                key={item.id}
                className={styles.card}
                onClick={() => handleRead(item.id)}
              >
                <View className={styles.cardLeft}>
                  <View className={styles.iconWrap}>
                    <Icon name='bell' size={22} color={item.read ? '#999' : '#1677FF'} />
                  </View>
                  {!item.read && <View className={styles.dot} />}
                </View>
                <View className={styles.cardRight}>
                  <Text className={`${styles.title} ${!item.read ? styles.titleUnread : ''}`}>
                    {item.title}
                  </Text>
                  <Text className={styles.content}>{item.content}</Text>
                  <Text className={styles.time}>{item.time}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </AuthGuard>
  )
}
