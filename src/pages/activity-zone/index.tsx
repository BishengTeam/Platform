import { useState, useMemo, useEffect, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { TagFilter } from '@/components/TagFilter'
import { ZoneCard } from '@/components/ZoneCard'
import { EmptyState } from '@/components/EmptyState'
import { CustomTabBar } from '@/components/TabBar'
import { RefreshableScrollView } from '@/components/RefreshableScrollView'
import { STRINGS } from '@/constants/strings'
import { FEATURES } from '@/constants/features'
import { getActivityList, getJobList, getCompetitionList } from '@/services/dataService'
import type { ActivityBrief, CompetitionBrief, JobBrief } from '@/types'
import type { TagFilterItem } from '@/types/registration'
import { resolveMediaUrl } from '@/utils/media'
import styles from './index.module.scss'

type MainTab = 'activity' | 'competition' | 'employment'

// v1 裁剪：「活动」tab 按开关隐藏，storage 回落校验也只认可见 tab，防止老用户被带回隐藏页
const VISIBLE_MAIN_TABS: MainTab[] = (
  ['activity', 'competition', 'employment'] as MainTab[]
).filter(tab => tab !== 'activity' || FEATURES.activityTab)

export default function ActivityZonePage() {
  const [mainTab, setMainTab] = useState<MainTab>('competition')

  // 从首页金刚区跳转时通过 storage 指定初始 tab；useDidShow 保证每次切回都能响应
  useDidShow(() => {
    const stored = Taro.getStorageSync('activityZoneTab') as MainTab | undefined
    if (stored) {
      if (VISIBLE_MAIN_TABS.includes(stored)) setMainTab(stored)
      Taro.removeStorageSync('activityZoneTab')
    }
  })
  const [activityTag, setActivityTag] = useState<string>(STRINGS.ACTIVITY_TAG_ALL)
  const [competitionTag, setCompetitionTag] = useState<string>(STRINGS.COMPETITION_TAG_ALL)

  const [allActivities, setAllActivities] = useState<ActivityBrief[]>([])
  const [allCompetitions, setAllCompetitions] = useState<CompetitionBrief[]>([])
  const [allJobs, setAllJobs] = useState<JobBrief[]>([])
  const [activitiesLoaded, setActivitiesLoaded] = useState(false)
  const [competitionsLoaded, setCompetitionsLoaded] = useState(false)
  const [jobsLoaded, setJobsLoaded] = useState(false)

  const load = useCallback(() => {
    return Promise.all([
      getActivityList().then((data) => {
        setAllActivities(data)
      }).catch(() => {}).finally(() => setActivitiesLoaded(true)),
      getCompetitionList().then((data) => {
        setAllCompetitions(data)
      }).catch(() => {}).finally(() => setCompetitionsLoaded(true)),
      getJobList().then((data) => {
        setAllJobs(data)
      }).catch(() => {}).finally(() => setJobsLoaded(true)),
    ])
  }, [])

  useEffect(() => { void load() }, [load])

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

  // 竞赛赛事列表
  const competitionData = useMemo(() => allCompetitions, [allCompetitions])

  // 就业岗位：无有效筛选维度，直接展示全部
  const employmentData = useMemo(() => allJobs, [allJobs])

  const getActivityStatusInfo = (item: ActivityBrief) => {
    if (ongoingActivities.some(a => a.id === item.id)) {
      return { label: STRINGS.ACTIVITY_ONGOING, color: '#1677FF' }
    }
    if (upcomingActivities.some(a => a.id === item.id)) {
      return { label: STRINGS.ACTIVITY_UPCOMING, color: '#FA8C16' }
    }
    return { label: STRINGS.ACTIVITY_ENDED, color: '#999999' }
  }

  // 竞赛状态：比赛结束 > 报名截止 > 报名中（已截止/已结束的赛事仍展示，仅标记状态）
  const getCompetitionStatusInfo = (comp: CompetitionBrief) => {
    const now = new Date()
    if (comp.end_time && new Date(comp.end_time) <= now) {
      return { label: STRINGS.COMPETITION_ENDED, color: '#999999' }
    }
    const deadlinePassed = comp.registration_deadline
      ? new Date(comp.registration_deadline) <= now
      : false
    if (deadlinePassed) {
      return { label: STRINGS.COMPETITION_REGISTRATION_CLOSED, color: '#FA541C' }
    }
    return { label: STRINGS.COMPETITION_STATUS_REGISTERING, color: '#52C41A' }
  }

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

  // Employment tag filters (matching employment-zone page style)
  const currentTagFilters = mainTab === 'activity'
    ? activityTagFilters
    : mainTab === 'competition'
      ? competitionTagFilters
      : []

  const mainTabs = VISIBLE_MAIN_TABS.map(tab => ({
    key: tab,
    label: tab === 'activity' ? '活动' : tab === 'competition' ? '竞赛' : '就业',
  }))

  const showActivityEmpty = activitiesLoaded && allActivities.length === 0
  const showCompetitionEmpty = competitionsLoaded && allCompetitions.length === 0
  const showEmploymentEmpty = jobsLoaded && allJobs.length === 0
  // 空态时隐藏筛选标签，避免出现一排筛选 + 空白列表
  const showTagFilter =
    (mainTab === 'competition' && !showCompetitionEmpty) ||
    (mainTab === 'activity' && !showActivityEmpty)

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

        <RefreshableScrollView className={styles.body} onRefresh={load}>
          <View className={styles.content}>
            {showTagFilter && (
              <TagFilter tags={currentTagFilters} activeTag={currentActiveTag} onChange={onTagChange} />
            )}

            {mainTab === 'activity' && (
              showActivityEmpty ? (
                <EmptyState
                  icon='gift'
                  title={STRINGS.ACTIVITY_EMPTY_TITLE}
                  description={STRINGS.ACTIVITY_EMPTY_DESC}
                />
              ) : (
              <View className={styles.cardList}>
                {activityData.map((item) => {
                  const status = getActivityStatusInfo(item)
                  return (
                    <ZoneCard
                      key={item.id}
                      coverUrl={resolveMediaUrl(item.cover_url)}
                      title={item.title}
                      statusLabel={status.label}
                      statusColor={status.color}
                      isFaded={status.label === STRINGS.ACTIVITY_ENDED}
                      onCardClick={() => {
                        Taro.navigateTo({ url: `/pages/activity-zone/detail?id=${item.id}` })
                      }}
                    />
                  )
                })}
              </View>
              )
            )}

            {mainTab === 'competition' && (
              showCompetitionEmpty ? (
                <EmptyState
                  icon='trophy'
                  title={STRINGS.COMPETITION_EMPTY_TITLE}
                  description={STRINGS.COMPETITION_EMPTY_DESC}
                />
              ) : (
                <View className={styles.cardList}>
                  {competitionData.map((comp) => {
                    const status = getCompetitionStatusInfo(comp)
                    return (
                      <ZoneCard
                        key={`comp-${comp.id}`}
                        title={comp.name}
                        statusLabel={status.label}
                        statusColor={status.color}
                        coverUrl={resolveMediaUrl(comp.cover_url)}
                        onCardClick={() => {
                          Taro.navigateTo({ url: `/pages/competition/detail?id=${comp.id}` })
                        }}
                      />
                    )
                  })}
                </View>
              )
            )}

            {mainTab === 'employment' && (
              showEmploymentEmpty ? (
                <EmptyState
                  icon='briefcase'
                  title={STRINGS.EMPLOYMENT_EMPTY_TITLE}
                  description={STRINGS.EMPLOYMENT_EMPTY_DESC}
                />
              ) : (
              <View className={styles.cardList}>
                {employmentData.map((job) => {
                  return (
                    <ZoneCard
                      key={job.id}
                      title={job.title}
                      subtitle={job.company ?? ''}
                      tags={[job.location ? `工作地点：${job.location}` : '']}
                      price={job.salary_range ?? ''}
                      buttonText='了解详情'
                      buttonVariant='secondary'
                      buttonColor='#13C2C2'
                      onCardClick={() => {
                        Taro.navigateTo({ url: `/pages/employment-zone/detail?id=${job.id}` })
                      }}
                    />
                  )
                })}
              </View>
              )
            )}
          </View>
          </RefreshableScrollView>

        <CustomTabBar activeTabKey='pages/activity-zone/index' onSwitch={(url) => Taro.switchTab({ url })} />
      </View>
    </AuthGuard>
  )
}
