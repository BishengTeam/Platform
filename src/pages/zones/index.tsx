import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { Icon } from '@/components/Icon'
import { PageHeader } from '@/components/PageHeader'
import TabBar from '@/components/TabBar'
import { ZONE_ROUTES } from '@/constants/routes'
import { STRINGS } from '@/constants/strings'
import styles from './index.module.scss'

const zoneRoutes = ZONE_ROUTES

export default function ZonesPage() {
  const handleNavigate = (zone: string) => {
    const url = zoneRoutes[zone]
    if (url) Taro.navigateTo({ url })
  }

  return (
    <AuthGuard>
    <View className={styles.page}>
      <PageHeader title={STRINGS.ZONES_HEADER} />

      <View className={styles.body}>
        <View className={styles.banner}>
          <View className={styles.bannerContent}>
            <View className={styles.bannerTitle}>{STRINGS.ZONES_BANNER_TITLE}</View>
            <View className={styles.bannerDesc}>{STRINGS.ZONES_BANNER_DESC}</View>
            <View className={styles.bannerBtn}>{STRINGS.ZONES_BANNER_BTN}</View>
          </View>
          <View className={styles.bannerIcon}>
            <Icon name='award' size={100} color='rgba(255,255,255,0.2)' />
          </View>
        </View>

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
      </View>
      <TabBar />
    </View>
    </AuthGuard>
  )
}
