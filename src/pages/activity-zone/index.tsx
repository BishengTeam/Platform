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
import {
  getActivityList, getJobList, getCompetitionList,
  remindActivity,
} from '@/services/dataService'
import type { ActivityBrief, CompetitionBrief, JobBrief } from '@/types'
import type { TagFilterItem } from '@/types/registration'
import { resolveMediaUrl } from '@/utils/media'
import { formatDate } from '@/utils/format'
import styles from './index.module.scss'

type MainTab = 'activity' | 'competition' | 'employment'

export default function ActivityZonePage() {
  const [mainTab, setMainTab] = useState<MainTab>('competition')

  // 从首页金刚区跳转时通过 storage 指定初始 tab；useDidShow 保证每次切回都能响应
  useDidShow(() => {
    const stored = Taro.getStorageSync('activityZoneTab') as MainTab | undefined
    if (stored && ['activity', 'competition', 'employment'].includes(stored)) {
      setMainTab(stored)
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

  const getActivityButton = (item: ActivityBrief) => {
    if (endedActivities.some(a => a.id === item.id)) {
      return { text: STRINGS.ACTIVITY_VIEW_DETAIL, variant: 'secondary' as const }
    }
    if (upcomingActivities.some(a => a.id === item.id)) {
      return { text: STRINGS.ACTIVITY_REMIND, variant: 'primary' as const }
    }
    return { text: STRINGS.ACTIVITY_JOIN, variant: 'primary' as const }
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

  const getEmploymentButton = (item: JobBrief) => {
    return {
      text: item.contact_info ? '复制联系方式' : '暂无联系方式',
      variant: 'secondary' as const,
    }
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

  const mainTabs = [
    { key: 'activity' as MainTab, label: '活动' },
    { key: 'competition' as MainTab, label: '竞赛' },
    { key: 'employment' as MainTab, label: '就业' },
  ]

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
                  const btn = getActivityButton(item)
                  const activityTime = [
                    formatDate(item.start_time, ''),
                    formatDate(item.end_time, ''),
                  ].filter(Boolean).join(' ~ ')
                  return (
                    <ZoneCard
                      key={item.id}
                      title={item.title}
                      subtitle={item.description ?? ''}
                      tags={[item.location ?? '', activityTime]}
                      statusLabel={status.label}
                      statusColor={status.color}
                      buttonText={btn.text}
                      buttonVariant={btn.variant}
                      buttonColor='#722ED1'
                      isFaded={status.label === STRINGS.ACTIVITY_ENDED}
                      onCardClick={() => {
                        Taro.navigateTo({ url: `/pages/activity-zone/detail?id=${item.id}` })
                      }}
                      onButtonClick={async () => {
                        try {
                          if (btn.text === STRINGS.ACTIVITY_JOIN || btn.text === STRINGS.ACTIVITY_VIEW_DETAIL) {
                            // 报名需收集姓名/电话，统一在详情页表单完成
                            Taro.navigateTo({ url: `/pages/activity-zone/detail?id=${item.id}` })
                          } else if (btn.text === STRINGS.ACTIVITY_REMIND) {
                            await remindActivity(item.id)
                            Taro.showToast({ title: '已设置提醒', icon: 'success' })
                          }
                        } catch (error) {
                          const fallback = btn.text === STRINGS.ACTIVITY_REMIND ? '设置提醒失败' : '报名失败'
                          Taro.showToast({ title: error instanceof Error ? error.message : fallback, icon: 'none', duration: 3000 })
                        }
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
                    const deadline = formatDate(comp.registration_deadline, '')
                    const status = getCompetitionStatusInfo(comp)
                    return (
                      <ZoneCard
                        key={`comp-${comp.id}`}
                        title={comp.name}
                        subtitle={comp.description ?? ''}
                        tags={[`赛道 ${comp.tracks.length} 个`, deadline ? `报名截止 ${deadline}` : '']}
                        statusLabel={status.label}
                        statusColor={status.color}
                        coverUrl={resolveMediaUrl(comp.cover_url)}
                        buttonText='查看详情'
                        buttonVariant='primary'
                        buttonColor='#FA8C16'
                        onCardClick={() => {
                          Taro.navigateTo({ url: `/pages/competition/detail?id=${comp.id}` })
                        }}
                        onButtonClick={() => {
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
                  const btn = getEmploymentButton(job)
                  return (
                    <ZoneCard
                      key={job.id}
                      title={job.title}
                      subtitle={job.company}
                      tags={[job.location ?? '']}
                      price={job.salary_range ?? ''}
                      buttonText={btn.text}
                      buttonVariant={btn.variant}
                      buttonColor='#13C2C2'
                      onCardClick={() => {
                        Taro.navigateTo({ url: `/pages/employment-zone/detail?id=${job.id}` })
                      }}
                      onButtonClick={() => {
                        if (!job.contact_info) {
                          Taro.showToast({ title: '暂无联系方式', icon: 'none' })
                          return
                        }
                        Taro.setClipboardData({ data: job.contact_info })
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
