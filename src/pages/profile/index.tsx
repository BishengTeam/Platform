import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { removeAuthToken } from '@/utils/storage'
import { ROUTES } from '@/constants/routes'
import { STRINGS } from '@/constants/strings'
import { Icon } from '@/components/Icon'
import TabBar from '@/components/TabBar'
import { getOrderItems, getProfileFunctions } from '@/services/dataService'
import styles from './index.module.scss'

const FUNC_ROUTES: Record<string, string> = {
  '证书中心': ROUTES.CERTIFICATES,
  '问题反馈': ROUTES.FEEDBACK,
  '消息通知': ROUTES.NOTIFICATIONS,
}

export default function ProfilePage() {
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const handleLogout = () => {
    setShowLogoutModal(true)
  }

  const confirmLogout = () => {
    setShowLogoutModal(false)
    removeAuthToken()
    Taro.reLaunch({ url: `/${ROUTES.AUTH}` })
  }

  const handleNavigate = (route: string) => {
    Taro.navigateTo({ url: `/${route}` })
  }

  return (
    <AuthGuard>
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.headerLeft}>
          <View className={styles.avatar}>
            <Icon name='user' size={32} color='#1677FF' />
          </View>
          <View>
            <View className={styles.name}>小王同学</View>
            <View className={styles.status}>H3CNE 备考中 · 积分 240</View>
          </View>
        </View>
      </View>

      <View className={styles.body}>
        <View className={styles.card}>
          <View className={styles.cardHead}>
            <Text className={styles.cardTitle}>{STRINGS.PROFILE_ORDERS}</Text>
            <View className={styles.cardMore} onClick={() => handleNavigate(ROUTES.ORDERS)}>
              <Text>{STRINGS.PROFILE_ALL_ORDERS}</Text>
              <Icon name='chevron-right' size={14} color='#999' />
            </View>
          </View>
          <View className={styles.orders}>
            {getOrderItems().map((item, idx) => (
              <View key={idx} className={styles.orderItem} onClick={() => handleNavigate(`${ROUTES.ORDERS}?status=${item.label}`)}>
                <View className={styles.orderIcon}>
                  <Icon name={item.icon} size={20} color='#1677FF' />
                  {item.badge > 0 && (
                    <View className={styles.orderBadge}>{item.badge}</View>
                  )}
                </View>
                <View className={styles.orderLabel}>{item.label}</View>
              </View>
            ))}
          </View>
        </View>

        <View className={styles.card}>
          {getProfileFunctions().map((item, idx) => (
            <View
              key={idx}
              className={`${styles.funcItem} ${idx !== 0 ? styles.funcBorder : ''}`}
              onClick={() => {
                const route = FUNC_ROUTES[item.label]
                if (route) handleNavigate(route)
              }}
            >
              <View className={styles.funcLeft}>
                <Icon name={item.icon} size={20} color='#69B1FF' />
                <Text className={styles.funcLabel}>{item.label}</Text>
              </View>
              <View className={styles.funcRight}>
                {item.value ? <Text className={styles.funcValue}>{item.value}</Text> : null}
                <Icon name='chevron-right' size={16} color='#999' />
              </View>
            </View>
          ))}

          <View className={`${styles.funcItem} ${styles.funcBorder}`} onClick={handleLogout}>
            <View className={styles.funcLeft}>
              <Icon name='log-out' size={20} color='#FF4D4F' />
              <Text className={styles.logoutText}>{STRINGS.PROFILE_LOGOUT}</Text>
            </View>
            <View className={styles.funcRight}>
              <Icon name='chevron-right' size={16} color='#999' />
            </View>
          </View>
        </View>
      </View>
      <TabBar />

      {showLogoutModal && (
        <View className={styles.modalOverlay}>
          <View className={styles.modalBox}>
            <Text className={styles.modalTitle}>提示</Text>
            <Text className={styles.modalContent}>确定要退出当前账号吗？</Text>
            <View className={styles.modalButtons}>
              <View className={styles.modalCancel} onClick={() => setShowLogoutModal(false)}>
                <Text className={styles.modalCancelText}>取消</Text>
              </View>
              <View className={styles.modalConfirm} onClick={confirmLogout}>
                <Text className={styles.modalConfirmText}>退出</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
    </AuthGuard>
  )
}
