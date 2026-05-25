import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import { Icon } from '@/components/Icon'
import { LogoutModal } from '@/components/LogoutModal'
import { STRINGS } from '@/constants/strings'
import type { ProfileFunction } from '@/types'
import styles from './index.module.scss'

interface FuncListProps {
  functions: ProfileFunction[]
  onNavigate: (route: string) => void
  onLogout: () => void
}

export function FuncList({ functions, onNavigate, onLogout }: FuncListProps) {
  const [isModalVisible, setModalVisible] = useState(false)

  const handleLogout = () => {
    setModalVisible(true)
  }

  const confirmLogout = () => {
    setModalVisible(false)
    onLogout()
  }

  return (
    <View className={styles.card}>
      {functions.map((item, idx) => (
        <View
          key={idx}
          className={`${styles.item} ${idx !== 0 ? styles.border : ''}`}
          onClick={() => onNavigate('')}
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
        isVisible={isModalVisible}
        onCancel={() => setModalVisible(false)}
        onConfirm={confirmLogout}
      />
    </View>
  )
}
