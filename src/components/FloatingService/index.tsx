import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Icon } from '@/components/Icon'
import styles from './index.module.scss'

export function FloatingService() {
  return (
    <View className={styles.btn} onClick={() => Taro.reLaunch({ url: `/pages/service/index` })}>
      <Icon name='headset' size={32} color='#1677FF' />
    </View>
  )
}
