import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { CustomTabBar } from '@/components/TabBar'
import { ZonesContent } from '@/components/ZonesContent'
import { STRINGS } from '@/constants/strings'
import { TAB_BAR_CONFIG } from '@/constants/routes'
import styles from './index.module.scss'

function isTabPage(url: string) {
  const path = url.replace(/^\//, '')
  return TAB_BAR_CONFIG.some(t => t.key === path)
}

export default function ZonesPage() {
  const handleZoneNavigate = (url: string) => {
    if (isTabPage(url)) {
      Taro.switchTab({ url })
    } else {
      Taro.navigateTo({ url })
    }
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.ZONES_HEADER} />
        <View className={styles.body}>
          <ZonesContent onZoneTap={handleZoneNavigate} />
        </View>
        <CustomTabBar activeTabKey='pages/zones/index' onSwitch={(url) => Taro.switchTab({ url })} />
      </View>
    </AuthGuard>
  )
}
