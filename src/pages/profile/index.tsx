import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { FuncList } from '@/components/FuncList'
import { Icon } from '@/components/Icon'
import { OrderBar } from '@/components/OrderBar'
import TabBar from '@/components/TabBar'
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
            <View className={styles.name}>小王同学</View>
            <View className={styles.status}>H3CNE 备考中</View>
          </View>
        </View>
      </View>

      <View className={styles.body}>
        <OrderBar onNavigate={handleNavigate} />
        <FuncList onNavigate={handleNavigate} />
      </View>
      <TabBar />
    </View>
    </AuthGuard>
  )
}
