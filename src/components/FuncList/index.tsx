import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Icon } from '@/components/Icon'
import { LogoutModal } from '@/components/LogoutModal'
import { removeAuthToken } from '@/utils/storage'
import { ROUTES } from '@/constants/routes'
import { STRINGS } from '@/constants/strings'
import { getProfileFunctions } from '@/services/dataService'
import styles from './index.module.scss'

const FUNC_ROUTES: Record<string, string> = {
  '证书中心': ROUTES.CERTIFICATES,
  '问题反馈': ROUTES.FEEDBACK,
  '消息通知': ROUTES.NOTIFICATIONS,
}

interface FuncListProps {
  onNavigate: (route: string) => void
}

export function FuncList({ onNavigate }: FuncListProps) {
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
      {getProfileFunctions().map((item, idx) => (
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
        visible={showModal}
        onCancel={() => setShowModal(false)}
        onConfirm={confirmLogout}
      />
    </View>
  )
}
