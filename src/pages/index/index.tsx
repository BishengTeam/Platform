import { useState, useEffect, useMemo } from 'react'
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
import { getHomeAggregation } from '@/services/dataService'
import type { HomeAggregationResponse } from '@/types'
import styles from './index.module.scss'

const BASE_KING_KONG_ITEMS: KingKongItem[] = [
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
    url: '/pages/activity-zone/index',
    tab: 'competition',
  },
]

export default function IndexPage() {
  const [homeData, setHomeData] = useState<HomeAggregationResponse | null>(null)

  useEffect(() => {
    getHomeAggregation().then((data) => {
      setHomeData(data)
    }).catch((err) => {
      // 加载失败静默处理，页面展示空状态
    })
  }, [])

  const handleGoConsult = () => {
    Taro.navigateTo({ url: `/${ROUTES.AI_CONSULT}` })
  }

  const handleKingKongClick = (item: KingKongItem) => {
    if (item.comingSoon) {
      Taro.showToast({ title: STRINGS.INDEX_ACTIVITY_COMING_SOON, icon: 'none' })
      return
    }
    if (!item.url) return
    const path = item.url.replace(/^\//, '')
    if (TAB_BAR_CONFIG.some(t => t.key === path)) {
      if (item.tab) {
        Taro.setStorageSync('activityZoneTab', item.tab)
      }
      Taro.switchTab({ url: `/${path}` })
    } else {
      Taro.navigateTo({ url: item.url })
    }
  }

  const handleGoStudyZone = () => {
    Taro.switchTab({ url: '/pages/training/index' })
  }

  const handleGoActivityZone = () => {
    const path = `/${ROUTES.ACTIVITY}`
    Taro.switchTab({ url: path })
  }

  const handleGoCompetitionZone = () => {
    Taro.setStorageSync('activityZoneTab', 'competition')
    Taro.switchTab({ url: `/${ROUTES.ACTIVITY}` })
  }

  const handleGoEmploymentZone = () => {
    Taro.setStorageSync('activityZoneTab', 'employment')
    Taro.switchTab({ url: `/${ROUTES.ACTIVITY}` })
  }

  const handleGoCertZone = () => {
    Taro.navigateTo({ url: `/${ROUTES.REGISTRATION_INDEX}` })
  }

  // 活动/就业瀑布流由后台内容驱动：管理端上架才出现，下架自动隐藏。
  const activities = homeData?.zones['activity']?.activities ?? []
  const employmentJobs = homeData?.zones['employment']?.jobs ?? []

  const kingKongItems = useMemo(() => {
    const items = [...BASE_KING_KONG_ITEMS]
    // 第 4 格只跟随活动：无上架活动时放灰色占位保持 2x2 完整，上架后自动让位。
    // 岗位不设金刚区入口，就业走首页瀑布流与活动 tab 子页。
    if (activities.length > 0) {
      items.push({
        name: STRINGS.ZONE_NAMES[3],
        bg: '#F9F0FF',
        iconColor: '#722ED1',
        icon: 'gift',
        url: '/pages/activity-zone/index',
        tab: 'activity',
      })
    } else {
      items.push({
        name: STRINGS.INDEX_ZONE_COMING_SOON,
        bg: '#F5F5F5',
        iconColor: '#999999',
        icon: 'sparkles',
        url: '',
        comingSoon: true,
      })
    }
    return items
  }, [activities.length])

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.INDEX_PAGE_TITLE} />

        <View className={styles.main}>
          <View className={styles.bannerWrap}>
            <ZoneBanner items={(homeData?.banners ?? []).map(b => ({
              id: b.id,
              title: '',
              image_url: b.image_url,
              jump_link: b.jump_link,
            }))} />
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

          <KingKongZone items={kingKongItems} onItemClick={handleKingKongClick} />

          {/* 在线课程暂时隐藏 */}
          {/* <View className={styles.section}>
            <SectionHeader title={STRINGS.INDEX_ONLINE_COURSES} onViewAll={handleGoStudyZone} />
            <HomeCard items={homeData?.zones['study']?.courses ?? []} onCardClick={handleGoStudyZone} />
          </View> */}

          {activities.length > 0 && (
            <View className={styles.section}>
              <SectionHeader title={STRINGS.INDEX_TRAINING_ACTIVITIES} onViewAll={handleGoActivityZone} />
              <HomeCard items={activities} onCardClick={handleGoActivityZone} />
            </View>
          )}

          <View className={styles.section}>
            <SectionHeader title={STRINGS.ZONE_NAMES[0]} onViewAll={handleGoCertZone} />
            <HomeCard items={homeData?.zones['cert']?.items ?? []} onCardClick={handleGoCertZone} />
          </View>

          <View className={styles.section}>
            <SectionHeader title={STRINGS.ZONE_NAMES[2]} onViewAll={handleGoCompetitionZone} />
            <HomeCard
              items={(homeData?.zones['competition']?.competitions ?? []).map((comp) => ({
                id: comp.id,
                title: comp.name,
                description: comp.description ?? '',
                cover_url: comp.cover_url,
                tag: comp.tracks.length > 0 ? `${comp.tracks.length} 条赛道` : undefined,
                tagColor: '#FA8C16',
              }))}
              onCardClick={handleGoCompetitionZone}
            />
          </View>

          {employmentJobs.length > 0 && (
            <View className={styles.section}>
              <SectionHeader title={STRINGS.ZONE_NAMES[4]} onViewAll={handleGoEmploymentZone} />
              <HomeCard
                items={employmentJobs.map((job) => ({
                  id: job.id,
                  title: job.title,
                  description: [job.company, job.location].filter(Boolean).join(' · ') || null,
                  tag: job.salary_range ?? undefined,
                  tagColor: '#13C2C2',
                }))}
                onCardClick={handleGoEmploymentZone}
              />
            </View>
          )}
        </View>

        <CustomTabBar activeTabKey='pages/index/index' onSwitch={(url) => Taro.switchTab({ url })} />
      </View>
    </AuthGuard>
  )
}
