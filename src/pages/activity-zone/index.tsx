import { useState, useMemo, useRef } from 'react'
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
  getActivityBannerItems, getActivityTagFilters,
  getOngoingActivities, getUpcomingActivities, getEndedActivities,
  getCompetitionBannerItems, getCompetitionTagFilters,
  getOngoingCompetitions, getUpcomingCompetitions, getEndedCompetitions,
  getEmploymentBannerItems, getEmploymentTagFilters, getJobList,
} from '@/services/dataService'
import type { Activity } from '@/types'
import type { Competition } from '@/types'
import type { Job } from '@/types'
import styles from './index.module.scss'

type MainTab = 'activity' | 'competition' | 'employment'

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
  const [employmentTag, setEmploymentTag] = useState<string>(STRINGS.EMPLOYMENT_TAG_ALL)

  const allActivities = useMemo(() => {
    return [...getOngoingActivities(), ...getUpcomingActivities(), ...getEndedActivities()]
  }, [])

  const allCompetitions = useMemo(() => {
    return [...getOngoingCompetitions(), ...getUpcomingCompetitions(), ...getEndedCompetitions()]
  }, [])

  const allJobs = useMemo(() => getJobList(), [])

  const activityData = useMemo(() => {
    if (activityTag === STRINGS.ACTIVITY_TAG_ALL) return allActivities
    if (activityTag === STRINGS.ACTIVITY_ONGOING) return getOngoingActivities()
    if (activityTag === STRINGS.ACTIVITY_UPCOMING) return getUpcomingActivities()
    return getEndedActivities()
  }, [activityTag, allActivities])

  const competitionData = useMemo(() => {
    if (competitionTag === STRINGS.COMPETITION_TAG_ALL) return allCompetitions
    if (competitionTag === STRINGS.COMPETITION_ONGOING) return getOngoingCompetitions()
    if (competitionTag === STRINGS.COMPETITION_UPCOMING) return getUpcomingCompetitions()
    return getEndedCompetitions()
  }, [competitionTag, allCompetitions])

  const getActivityStatusInfo = (item: Activity) => {
    if (getOngoingActivities().some(a => a.id === item.id)) {
      return { label: STRINGS.ACTIVITY_ONGOING, color: '#1677FF' }
    }
    if (getUpcomingActivities().some(a => a.id === item.id)) {
      return { label: STRINGS.ACTIVITY_UPCOMING, color: '#FA8C16' }
    }
    return { label: STRINGS.ACTIVITY_ENDED, color: '#999999' }
  }

  const getCompetitionStatusInfo = (item: Competition) => {
    if (getOngoingCompetitions().some(c => c.id === item.id)) {
      return { label: STRINGS.COMPETITION_ONGOING, color: '#1677FF' }
    }
    if (getUpcomingCompetitions().some(c => c.id === item.id)) {
      return { label: STRINGS.COMPETITION_UPCOMING, color: '#FA8C16' }
    }
    return { label: STRINGS.COMPETITION_ENDED, color: '#999999' }
  }

  const getActivityButton = (item: Activity) => {
    if (getEndedActivities().some(a => a.id === item.id)) {
      return { text: STRINGS.ACTIVITY_VIEW_DETAIL, variant: 'secondary' as const }
    }
    if (getUpcomingActivities().some(a => a.id === item.id)) {
      return { text: STRINGS.ACTIVITY_REMIND, variant: 'primary' as const }
    }
    return { text: STRINGS.ACTIVITY_JOIN, variant: 'primary' as const }
  }

  const getCompetitionButton = (item: Competition) => {
    if (getEndedCompetitions().some(c => c.id === item.id)) {
      return { text: STRINGS.COMPETITION_SIGNUP_ENDED, variant: 'secondary' as const }
    }
    return { text: STRINGS.COMPETITION_SIGNUP, variant: 'primary' as const }
  }

  const currentBannerItems = mainTab === 'activity'
    ? getActivityBannerItems()
    : mainTab === 'competition'
      ? getCompetitionBannerItems()
      : getEmploymentBannerItems()

  const currentTagFilters = mainTab === 'activity'
    ? getActivityTagFilters()
    : mainTab === 'competition'
      ? getCompetitionTagFilters()
      : getEmploymentTagFilters()

  const currentActiveTag = mainTab === 'activity'
    ? activityTag
    : mainTab === 'competition'
      ? competitionTag
      : employmentTag

  const onTagChange = mainTab === 'activity'
    ? setActivityTag
    : mainTab === 'competition'
      ? setCompetitionTag
      : setEmploymentTag

  const mainTabs = [
    { key: 'activity' as MainTab, label: '活动' },
    { key: 'competition' as MainTab, label: '竞赛' },
    { key: 'employment' as MainTab, label: '就业' },
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
            <ZoneBanner items={currentBannerItems} />
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
                      subtitle={item.description}
                      tags={[item.benefit, `${item.startTime}-${item.endTime}`]}
                      statusLabel={status.label}
                      statusColor={status.color}
                      buttonText={btn.text}
                      buttonVariant={btn.variant}
                      buttonColor='#722ED1'
                      isFaded={status.label === STRINGS.ACTIVITY_ENDED}
                    />
                  )
                })}
              </View>
            )}

            {mainTab === 'competition' && (
              <View className={styles.cardList}>
                {competitionData.map((item) => {
                  const status = getCompetitionStatusInfo(item)
                  const btn = getCompetitionButton(item)
                  return (
                    <ZoneCard
                      key={item.id}
                      title={item.title}
                      subtitle={item.description}
                      tags={[item.prize, `${item.startTime}-${item.endTime}`]}
                      statusLabel={status.label}
                      statusColor={status.color}
                      buttonText={btn.text}
                      buttonVariant={btn.variant}
                      buttonColor='#FA8C16'
                      isFaded={status.label === STRINGS.COMPETITION_ENDED}
                    />
                  )
                })}
              </View>
            )}

            {mainTab === 'employment' && (
              <View className={styles.cardList}>
                {allJobs.map((item: Job) => (
                  <ZoneCard
                    key={item.id}
                    title={item.title}
                    subtitle={`${item.company} | ${item.location} ${item.experience} ${item.education}`}
                    price={item.salary}
                    originalPrice={item.originalPrice}
                    buttonText={STRINGS.EMPLOYMENT_APPLY}
                    buttonColor='#13C2C2'
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        <CustomTabBar activeTabKey='pages/activity-zone/index' onSwitch={(url) => Taro.switchTab({ url })} />
      </View>
    </AuthGuard>
  )
}
