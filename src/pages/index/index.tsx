import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Avatar } from '@nutui/nutui-react-taro'

import { Icon } from '@/components/Icon'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { SectionHeader } from '@/components/SectionHeader'
import { HomeCard } from '@/components/HomeCard'
import { ZoneBanner } from '@/components/ZoneBanner'
import { KingKongZone } from '@/components/KingKongZone'
import type { KingKongItem } from '@/components/KingKongZone'
import { CustomTabBar } from '@/components/TabBar'
import { STRINGS } from '@/constants/strings'
import { ROUTES, TAB_BAR_CONFIG } from '@/constants/routes'
import { getExamBannerItems, getHomeCourses, getHomeActivities } from '@/services/dataService'
import styles from './index.module.scss'

const KING_KONG_ITEMS: KingKongItem[] = [
  {
    name: STRINGS.INDEX_ZONE_REGISTRATION,
    bg: '#E6F7FF',
    iconColor: '#1a73e8',
    icon: 'check-circle-2',
    url: '/pages/registration/index',
  },
  {
    name: STRINGS.INDEX_ZONE_STUDY,
    bg: '#F6FFED',
    iconColor: '#2e7d32',
    icon: 'book-open',
    url: '/pages/training/index',
  },
  {
    name: STRINGS.INDEX_ZONE_COMPETITION,
    bg: '#FFF7E6',
    iconColor: '#c67c00',
    icon: 'trophy',
    url: '/pages/competition-zone/index',
  },
  {
    name: STRINGS.ZONE_NAMES[3],
    bg: '#E6FFFB',
    iconColor: '#13C2C2',
    icon: 'gift',
    url: '/pages/activity-zone/index',
  },
]

export default function IndexPage() {
  const handleGoConsult = () => {
    Taro.navigateTo({ url: `/${ROUTES.AI_CONSULT}` })
  }

  const handleKingKongClick = (item: KingKongItem) => {
    if (!item.url) return
    const path = item.url.replace(/^\//, '')
    if (TAB_BAR_CONFIG.some(t => t.key === path)) {
      Taro.switchTab({ url: item.url })
    } else {
      Taro.navigateTo({ url: item.url })
    }
  }

  const handleGoStudyZone = () => {
    Taro.switchTab({ url: '/pages/training/index' })
  }

  const courses = getHomeCourses()
  const activities = getHomeActivities()

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.INDEX_PAGE_TITLE} />

        <View className={styles.main}>
          <View className={styles.bannerWrap}>
            <ZoneBanner items={getExamBannerItems()} />
          </View>

          <View className={styles.aiCard} onClick={handleGoConsult}>
            <View className={styles.aiCardLeft}>
              <Avatar size='44' icon={<Icon name='sparkles' size={20} color='#1677FF' />} background='#E6F7FF' />
              <View className={styles.aiCardInfo}>
                <Text className={styles.aiCardTitle}>{STRINGS.INDEX_AI_NAME}</Text>
                <Text className={styles.aiCardDesc}>{STRINGS.INDEX_AI_DESC}</Text>
              </View>
            </View>
            <View className={styles.aiCardRight}>
              <Text className={styles.aiCardAction}>{STRINGS.INDEX_AI_CONSULT_BTN}</Text>
              <Icon name='chevron-right' size={16} color='#1677FF' />
            </View>
          </View>

          <KingKongZone items={KING_KONG_ITEMS} onItemClick={handleKingKongClick} />

          <View className={styles.section}>
            <SectionHeader title={STRINGS.INDEX_ONLINE_COURSES} onViewAll={handleGoStudyZone} />
            <HomeCard items={courses} onCardClick={handleGoStudyZone} />
          </View>

          <View className={styles.section}>
            <SectionHeader title={STRINGS.INDEX_TRAINING_ACTIVITIES} onViewAll={handleGoStudyZone} />
            <HomeCard items={activities} onCardClick={handleGoStudyZone} />
          </View>
        </View>

        <CustomTabBar activeTabKey='pages/index/index' onSwitch={(url) => Taro.switchTab({ url })} />
      </View>
    </AuthGuard>
  )
}
