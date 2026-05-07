import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { ZONE_ROUTES } from '@/constants/routes'
import { STRINGS } from '@/constants/strings'
import styles from './index.module.scss'

export function ZonesContent() {
  const handleNavigate = (zone: string) => {
    const url = ZONE_ROUTES[zone]
    if (url) Taro.navigateTo({ url })
  }

  return (
    <View className={styles.gridCard}>
        <View className={styles.gridTitle}>{STRINGS.ZONES_GRID_TITLE}</View>
        <View className={styles.grid}>
          {STRINGS.ZONE_NAMES.map((zone) => (
            <View key={zone} className={styles.gridItem} onClick={() => handleNavigate(zone)}>
              <View className={styles.gridItemText}>{zone}</View>
              <View className={styles.gridItemSub}>{STRINGS.ZONES_GRID_DETAIL}</View>
            </View>
          ))}
        </View>
    </View>
  )
}
