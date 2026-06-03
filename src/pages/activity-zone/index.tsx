import { useState, useMemo, useRef, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { ZoneBanner } from '@/components/ZoneBanner'
import { TagFilter } from '@/components/TagFilter'
import { ZoneCard } from '@/components/ZoneCard'
import { CustomTabBar } from '@/components/TabBar'
import { STRINGS } from '@/constants/strings'
import {
  getActivityZone, getCompetitionZone,
  enrollActivity, remindActivity, signupCompetition,
} from '@/services/dataService'
import type { ActivityBrief, CompetitionBrief } from '@/types'
import type { ActivityZoneResponse, CompetitionZoneResponse, ZoneBrief } from '@/types'
import type { TagFilterItem } from '@/types/registration'
import styles from './index.module.scss'

type MainTab = 'activity' | 'competition'

export default function ActivityZonePage() {
  const storedTab = useRef(Taro.getStorageSync('activityZoneTab') as MainTab | undefined)
  const initialTab = storedTab.current || 'activity'
  const [mainTab, setMainTab] = useState<MainTab>(initialTab)

  if (storedTab.current) {
    Taro.removeStorageSync('activityZoneTab')
    storedTab.current = undefined
  }
  const [activityTag, setActivityTag] = useState<string>(STRINGS.ACTIVITY_TAG_ALL)
  const [competitionTag, setCompetitionTag] = useState<string>(STRINGS.COMPETITION_TAG_ALL)

  const [activityBanner, setActivityBanner] = useState<ZoneBrief | null>(null)
  const [competitionBanner, setCompetitionBanner] = useState<ZoneBrief | null>(null)
  const [allActivities, setAllActivities] = useState<ActivityBrief[]>([])
  const [allCompetitions, setAllCompetitions] = useState<CompetitionBrief[]>([])

  useEffect(() => {
    getActivityZone().then((data: ActivityZoneResponse) => {
      setAllActivities(data.activities)
      setActivityBanner(data.zones[0] ?? null)
    })
    getCompetitionZone().then((data: CompetitionZoneResponse) => {
      setAllCompetitions(data.competitions)
      setCompetitionBanner(data.zones[0] ?? null)
    })
  }, [])

  // Activity time-based grouping
  const { ongoingActivities, upcomingActivities, endedActivities } = useMemo(() => {
    const now = new Date()
    const ongoing = allActivities.filter(a => {
      if (!a.start_time || !a.end_time) return false
      return new Date(a.start_time) <= now && new Date(a.end_time) >= now
    })
    const upcoming = allActivities.filter(a => a.start_time && new Date(a.start_time) > now)
    const ended = allActivities.filter(a => a.end_time && new Date(a.end_time) < now)
    return { ongoingActivities: ongoing, upcomingActivities: upcoming, endedActivities: ended }
  }, [allActivities])

  const activityData = useMemo(() => {
    if (activityTag === STRINGS.ACTIVITY_TAG_ALL) return allActivities
    if (activityTag === STRINGS.ACTIVITY_ONGOING) return ongoingActivities
    if (activityTag === STRINGS.ACTIVITY_UPCOMING) return upcomingActivities
    return endedActivities
  }, [activityTag, allActivities, ongoingActivities, upcomingActivities, endedActivities])

  // CompetitionBrief only has created_at; treat all as active
  const competitionData = useMemo(() => {
    return allCompetitions
  }, [allCompetitions])

  const getActivityStatusInfo = (item: ActivityBrief) => {
    if (ongoingActivities.some(a => a.id === item.id)) {
      return { label: STRINGS.ACTIVITY_ONGOING, color: '#1677FF' }
    }
    if (upcomingActivities.some(a => a.id === item.id)) {
      return { label: STRINGS.ACTIVITY_UPCOMING, color: '#FA8C16' }
    }
    return { label: STRINGS.ACTIVITY_ENDED, color: '#999999' }
  }

  const getActivityButton = (item: ActivityBrief) => {
    if (endedActivities.some(a => a.id === item.id)) {
      return { text: STRINGS.ACTIVITY_VIEW_DETAIL, variant: 'secondary' as const }
    }
    if (upcomingActivities.some(a => a.id === item.id)) {
      return { text: STRINGS.ACTIVITY_REMIND, variant: 'primary' as const }
    }
    return { text: STRINGS.ACTIVITY_JOIN, variant: 'primary' as const }
  }

  const getCompetitionButton = (_item: CompetitionBrief) => {
    return { text: STRINGS.COMPETITION_SIGNUP, variant: 'primary' as const }
  }

  const currentBanner = mainTab === 'activity' ? activityBanner : competitionBanner

  const currentActiveTag = mainTab === 'activity'
    ? activityTag
    : competitionTag

  const onTagChange = mainTab === 'activity'
    ? setActivityTag
    : setCompetitionTag

  // Hardcoded time-based tag filters for activity tab
  const activityTagFilters: TagFilterItem[] = [
    { label: STRINGS.ACTIVITY_TAG_ALL, activeColor: '#722ED1', activeBg: '#722ED1', activeText: '#ffffff', inactiveBg: '#F0F5FF' },
    { label: STRINGS.ACTIVITY_ONGOING, activeColor: '#1677FF', activeBg: '#1677FF', activeText: '#ffffff', inactiveBg: '#F0F5FF' },
    { label: STRINGS.ACTIVITY_UPCOMING, activeColor: '#FA8C16', activeBg: '#FA8C16', activeText: '#ffffff', inactiveBg: '#FFF7E6' },
    { label: STRINGS.ACTIVITY_ENDED, activeColor: '#999999', activeBg: '#999999', activeText: '#ffffff', inactiveBg: '#F0F5FF' },
  ]

  // Simple tag for competition (no real tags with CompetitionBrief)
  const competitionTagFilters: TagFilterItem[] = [
    { label: STRINGS.COMPETITION_TAG_ALL, activeColor: '#FA8C16', activeBg: '#FA8C16', activeText: '#ffffff', inactiveBg: '#F0F5FF' },
  ]

  const currentTagFilters = mainTab === 'activity' ? activityTagFilters : competitionTagFilters

  const mainTabs = [
    { key: 'activity' as MainTab, label: '活动' },
    { key: 'competition' as MainTab, label: '竞赛' },
  ]

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.ACTIVITY_TITLE} />

        <View className={styles.mainTabs}>
          {mainTabs.map(tab => (
            <View
              key={tab.key}
              className={`${styles.mainTab} ${mainTab === tab.key ? styles.mainTabActive : ''}`}
              onClick={() => setMainTab(tab.key)}
            >
              <Text>{tab.label}</Text>
            </View>
          ))}
        </View>

        <ScrollView className={styles.body} scrollY>
          <View className={styles.bannerWrap}>
            {currentBanner ? (
              <ZoneBanner items={[{
                id: currentBanner.id,
                title: currentBanner.title,
                description: currentBanner.description ?? '',
                gradient: 'gradient-purple',
                buttonText: '查看详情',
                buttonColor: '#ffffff',
                image_url: currentBanner.cover_url ?? undefined,
              }]} />
            ) : null}
          </View>
          <View className={styles.content}>
            <TagFilter tags={currentTagFilters} activeTag={currentActiveTag} onChange={onTagChange} />

            {mainTab === 'activity' && (
              <View className={styles.cardList}>
                {activityData.map((item) => {
                  const status = getActivityStatusInfo(item)
                  const btn = getActivityButton(item)
                  return (
                    <ZoneCard
                      key={item.id}
                      title={item.title}
                      subtitle={item.description ?? ''}
                      tags={[item.location ?? '', `${item.start_time ?? ''}-${item.end_time ?? ''}`]}
                      statusLabel={status.label}
                      statusColor={status.color}
                      buttonText={btn.text}
                      buttonVariant={btn.variant}
                      buttonColor='#722ED1'
                      isFaded={status.label === STRINGS.ACTIVITY_ENDED}
                      onButtonClick={() => {
                        if (btn.text === STRINGS.ACTIVITY_JOIN) {
                          enrollActivity(item.id)
                          Taro.showToast({ title: '报名成功', icon: 'success' })
                        } else if (btn.text === STRINGS.ACTIVITY_REMIND) {
                          remindActivity(item.id)
                          Taro.showToast({ title: '已设置提醒', icon: 'success' })
                        }
                      }}
                    />
                  )
                })}
              </View>
            )}

            {mainTab === 'competition' && (
              <View className={styles.cardList}>
                {competitionData.map((item) => {
                  const btn = getCompetitionButton(item)
                  return (
                    <ZoneCard
                      key={item.id}
                      title={item.competition_name}
                      subtitle={`${item.school}${item.track ? ` | ${item.track}` : ''}`}
                      tags={[item.created_at]}
                      buttonText={btn.text}
                      buttonVariant={btn.variant}
                      buttonColor='#FA8C16'
                      onButtonClick={() => {
                        signupCompetition(item.id)
                        Taro.showToast({ title: '报名成功', icon: 'success' })
                      }}
                    />
                  )
                })}
              </View>
            )}
          </View>
        </ScrollView>

        <CustomTabBar activeTabKey='pages/activity-zone/index' onSwitch={(url) => Taro.switchTab({ url })} />
      </View>
    </AuthGuard>
  )
}