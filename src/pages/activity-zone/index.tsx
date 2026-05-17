import { useState } from 'react'
import { View, Text } from '@tarojs/components'
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
  getEmploymentTagFilters, getJobList,
} from '@/services/dataService'
import styles from './index.module.scss'

export default function ActivityZonePage() {
  const [activityTag, setActivityTag] = useState<string>(STRINGS.ACTIVITY_ONGOING)
  const [employmentTag, setEmploymentTag] = useState<string>(STRINGS.EMPLOYMENT_TAG_RECOMMEND)

  const activityData = activityTag === STRINGS.ACTIVITY_ONGOING
    ? getOngoingActivities()
    : activityTag === STRINGS.ACTIVITY_UPCOMING
      ? getUpcomingActivities()
      : getEndedActivities()

  const jobs = getJobList()

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.ACTIVITY_TITLE} />
        <View className={styles.body}>
          <View className={styles.bannerWrap}>
            <ZoneBanner items={getActivityBannerItems()} />
          </View>

          <View className={styles.section}>
            <Text className={styles.sectionTitle}>{STRINGS.ACTIVITY_DISCOUNT_SECTION}</Text>
            <TagFilter tags={getActivityTagFilters()} activeTag={activityTag} onChange={setActivityTag} />
            <View className={styles.cardList}>
              {activityData.map((item) => (
                <ZoneCard
                  key={item.id}
                  title={item.title}
                  subtitle={item.description}
                  tags={[item.benefit, `${item.startTime}-${item.endTime}`]}
                  buttonText={activityTag === STRINGS.ACTIVITY_ENDED
                    ? STRINGS.ACTIVITY_VIEW_DETAIL
                    : activityTag === STRINGS.ACTIVITY_UPCOMING
                      ? STRINGS.ACTIVITY_REMIND
                      : STRINGS.ACTIVITY_JOIN}
                  buttonVariant={activityTag === STRINGS.ACTIVITY_ENDED ? 'secondary' : 'primary'}
                  isFaded={activityTag === STRINGS.ACTIVITY_ENDED}
                />
              ))}
            </View>
          </View>

          <View className={styles.section}>
            <Text className={styles.sectionTitle}>{STRINGS.EMPLOYMENT_TITLE}</Text>
            <TagFilter tags={getEmploymentTagFilters()} activeTag={employmentTag} onChange={setEmploymentTag} />
            <View className={styles.cardList}>
              {jobs.map((job) => (
                <ZoneCard
                  key={job.id}
                  title={job.title}
                  subtitle={job.company}
                  tags={[job.location, job.experience, job.education]}
                  price={job.salary}
                  buttonText={STRINGS.EMPLOYMENT_APPLY}
                />
              ))}
            </View>
          </View>
        </View>
        <CustomTabBar activeTabKey='pages/activity-zone/index' onSwitch={(url) => Taro.switchTab({ url })} />
      </View>
    </AuthGuard>
  )
}
