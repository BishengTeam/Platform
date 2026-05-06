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

export default function ProfilePage() {
  const handleLogout = () => {
    removeAuthToken()
    Taro.reLaunch({ url: `/${ROUTES.AUTH}` })
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
        <Icon name='settings' size={24} color='rgba(255,255,255,0.9)' />
      </View>

      <View className={styles.body}>
        <View className={styles.card}>
          <View className={styles.cardHead}>
            <Text className={styles.cardTitle}>{STRINGS.PROFILE_ORDERS}</Text>
            <View className={styles.cardMore}>
              <Text>{STRINGS.PROFILE_ALL_ORDERS}</Text>
              <Icon name='chevron-right' size={14} color='#999' />
            </View>
          </View>
          <View className={styles.orders}>
            {getOrderItems().map((item, idx) => (
              <View key={idx} className={styles.orderItem}>
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
            <View key={idx} className={`${styles.funcItem} ${idx !== 0 ? styles.funcBorder : ''}`}>
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
    </View>
    </AuthGuard>
  )
}
