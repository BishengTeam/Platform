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
  getHomeAggregation, getActivityList, getJobList, getCompetitionList,
  enrollActivity, remindActivity, signupCompetition, applyJob,
} from '@/services/dataService'
import type { ActivityBrief, CompetitionBrief, JobBrief, ZoneBrief } from '@/types'
import type { TagFilterItem } from '@/types/registration'
import type { HomeAggregationResponse } from '@/types'
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

  const [activityBanner, setActivityBanner] = useState<ZoneBrief | null>(null)
  const [competitionBanner, setCompetitionBanner] = useState<ZoneBrief | null>(null)
  const [employmentBanner, setEmploymentBanner] = useState<ZoneBrief | null>(null)
  const [allActivities, setAllActivities] = useState<ActivityBrief[]>([])
  const [allCompetitions, setAllCompetitions] = useState<CompetitionBrief[]>([])
  const [allJobs, setAllJobs] = useState<JobBrief[]>([])

  useEffect(() => {
    getHomeAggregation().then((data: HomeAggregationResponse) => {
      setCompetitionBanner(data.zones['competition']?.items?.[0] ?? null)
    }).catch(() => {})
    getActivityList().then((data) => {
      setAllActivities(data)
      setActivityBanner(null)
    }).catch(() => {})
    getCompetitionList().then((data) => {
      setAllCompetitions(data)
    }).catch(() => {})
    getJobList().then((data) => {
      setAllJobs(data)
      setEmploymentBanner(null)
    }).catch(() => {})
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

  // Employment jobs filtering
  const employmentData = useMemo(() => {
    if (employmentTag === STRINGS.EMPLOYMENT_TAG_ALL) return allJobs
    // If specific tag selected, filter by matching tag in hardcoded tag list
    return allJobs.filter(job => {
      const tag = employmentTag.toLowerCase()
      return (job.title + (job.company ?? '') + (job.location ?? '')).toLowerCase().includes(tag)
    })
  }, [employmentTag, allJobs])

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

  const getEmploymentButton = (_item: JobBrief) => {
    return { text: STRINGS.EMPLOYMENT_APPLY, variant: 'primary' as const }
  }

  const currentBanner = mainTab === 'activity'
    ? activityBanner
    : mainTab === 'competition'
      ? competitionBanner
      : employmentBanner

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

  // Employment tag filters (matching employment-zone page style)
  const employmentTagFilters: TagFilterItem[] = [
    { label: STRINGS.EMPLOYMENT_TAG_ALL, activeColor: '#13C2C2', activeBg: '#13C2C2', activeText: '#ffffff', inactiveBg: '#F0F5FF' },
    { label: STRINGS.EMPLOYMENT_TAG_RECOMMEND, activeColor: '#13C2C2', activeBg: '#13C2C2', activeText: '#ffffff', inactiveBg: '#F0F5FF' },
  ]

  const currentTagFilters = mainTab === 'activity'
    ? activityTagFilters
    : mainTab === 'competition'
      ? competitionTagFilters
      : employmentTagFilters

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
            {currentBanner ? (
              <ZoneBanner items={[{
                id: currentBanner.id,
                title: currentBanner.title,
                description: currentBanner.description ?? '',
                gradient: mainTab === 'employment' ? 'gradient-teal' : mainTab === 'competition' ? 'gradient-orange' : 'gradient-purple',
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
                      onButtonClick={async () => {
                        try {
                          if (btn.text === STRINGS.ACTIVITY_JOIN) {
                            await enrollActivity(item.id)
                            Taro.showToast({ title: '报名成功', icon: 'success' })
                          } else if (btn.text === STRINGS.ACTIVITY_REMIND) {
                            await remindActivity(item.id)
                            Taro.showToast({ title: '已设置提醒', icon: 'success' })
                          }
                        } catch { /* 错误已由 request 层统一 toast */ }
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
                      subtitle={item.school}
                      tags={[item.track ?? '']}
                      buttonText={btn.text}
                      buttonVariant={btn.variant}
                      buttonColor='#FA8C16'
                      onButtonClick={async () => {
                        try {
                          await signupCompetition(item.competition_name, item.school, item.track ?? undefined)
                          Taro.showToast({ title: '报名成功', icon: 'success' })
                        } catch { /* 错误已由 request 层统一 toast */ }
                      }}
                    />
                  )
                })}
              </View>
            )}

            {mainTab === 'employment' && (
              <View className={styles.cardList}>
                {employmentData.map((job) => {
                  const btn = getEmploymentButton(job)
                  return (
                    <ZoneCard
                      key={job.id}
                      title={job.title}
                      subtitle={job.company}
                      tags={[job.location ?? '', job.salary_range ?? '']}
                      price={job.salary_range ?? ''}
                      buttonText={btn.text}
                      buttonVariant={btn.variant}
                      buttonColor='#13C2C2'
                      onButtonClick={async () => {
                        try {
                          await applyJob(job.id)
                          Taro.showToast({ title: '投递成功', icon: 'success' })
                        } catch { /* 错误已由 request 层统一 toast */ }
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