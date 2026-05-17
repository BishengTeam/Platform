import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { FuncList } from '@/components/FuncList'
import { Icon } from '@/components/Icon'
import { OrderBar } from '@/components/OrderBar'
import { CustomTabBar } from '@/components/TabBar'
import { STRINGS } from '@/constants/strings'
import { getOrderItems, getProfileFunctions } from '@/services/dataService'
import styles from './index.module.scss'

export default function ProfilePage() {
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
              <View className={styles.name}>{STRINGS.PROFILE_MOCK_NAME}</View>
              <View className={styles.status}>{STRINGS.PROFILE_MOCK_STATUS}</View>
            </View>
          </View>
        </View>

        <View className={styles.body}>
          <OrderBar items={getOrderItems()} onNavigate={handleNavigate} />
          <FuncList functions={getProfileFunctions()} onNavigate={handleNavigate} />
        </View>
        <CustomTabBar />
      </View>
    </AuthGuard>
  )
}
