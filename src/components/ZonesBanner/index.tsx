import { View } from '@tarojs/components'
import { Icon } from '@/components/Icon'
import { STRINGS } from '@/constants/strings'
import styles from './index.module.scss'

export function ZonesIntroBanner() {
  return (
    <View className={styles.banner}>
      <View className={styles.content}>
        <View className={styles.title}>{STRINGS.ZONES_BANNER_TITLE}</View>
        <View className={styles.desc}>{STRINGS.ZONES_BANNER_DESC}</View>
        <View className={styles.btn}>{STRINGS.ZONES_BANNER_BTN}</View>
      </View>
      <View className={styles.icon}>
        <Icon name='award' size={100} color='rgba(255,255,255,0.2)' />
      </View>
    </View>
  )
}
