import { View } from '@tarojs/components'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import TabBar from '@/components/TabBar'
import { ZonesContent } from '@/components/ZonesContent'
import { ZoneBanner } from '@/components/ZoneBanner'
import { STRINGS } from '@/constants/strings'
import { getExamBannerItems } from '@/services/dataService'
import styles from './index.module.scss'

export default function ZonesPage() {
  return (
    <AuthGuard>
    <View className={styles.page}>
      <PageHeader title={STRINGS.ZONES_HEADER} />
      <View className={styles.body}>
        <ZoneBanner items={getExamBannerItems()} />
        <ZonesContent />
      </View>
      <TabBar />
    </View>
    </AuthGuard>
  )
}
