import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Icon } from '@/components/Icon'
import { LogoutModal } from '@/components/LogoutModal'
import { removeAuthToken } from '@/utils/storage'
import { ROUTES } from '@/constants/routes'
import { STRINGS } from '@/constants/strings'
import type { ProfileFunction } from '@/types'
import styles from './index.module.scss'

const FUNC_ROUTES: Record<string, string> = {
  [STRINGS.FUNC_LIST_CERTIFICATES]: ROUTES.CERTIFICATES,
  [STRINGS.FUNC_LIST_FEEDBACK]: ROUTES.FEEDBACK,
  [STRINGS.FUNC_LIST_NOTIFICATIONS]: ROUTES.NOTIFICATIONS,
}

interface FuncListProps {
  functions: ProfileFunction[]
  onNavigate: (route: string) => void
}

export function FuncList({ functions, onNavigate }: FuncListProps) {
  const [showModal, setShowModal] = useState(false)

  const handleLogout = () => {
    setShowModal(true)
  }

  const confirmLogout = () => {
    setShowModal(false)
    removeAuthToken()
    Taro.reLaunch({ url: `/${ROUTES.AUTH}` })
  }

  return (
    <View className={styles.card}>
      {functions.map((item, idx) => (
        <View
          key={idx}
          className={`${styles.item} ${idx !== 0 ? styles.border : ''}`}
          onClick={() => {
            const route = FUNC_ROUTES[item.label]
            if (route) onNavigate(route)
          }}
        >
          <View className={styles.left}>
            <Icon name={item.icon} size={20} color='#69B1FF' />
            <Text className={styles.label}>{item.label}</Text>
          </View>
          <View className={styles.right}>
            {item.value ? <Text className={styles.value}>{item.value}</Text> : null}
            <Icon name='chevron-right' size={16} color='#999' />
          </View>
        </View>
      ))}

      <View className={`${styles.item} ${styles.border}`} onClick={handleLogout}>
        <View className={styles.left}>
          <Icon name='log-out' size={20} color='#FF4D4F' />
          <Text className={styles.logoutLabel}>{STRINGS.PROFILE_LOGOUT}</Text>
        </View>
        <View className={styles.right}>
          <Icon name='chevron-right' size={16} color='#999' />
        </View>
      </View>

      <LogoutModal
        isVisible={showModal}
        onCancel={() => setShowModal(false)}
        onConfirm={confirmLogout}
      />
    </View>
  )
}
