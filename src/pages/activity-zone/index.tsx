import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { ZonePage } from '@/components/ZonePage'
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
    <View className={styles.page}>
      <ZonePage
        title={STRINGS.ACTIVITY_TITLE}
        bannerItems={getActivityBannerItems()}
        tagFilters={getActivityTagFilters()}
        activeTag={activityTag}
        onTagChange={setActivityTag}
        shouldShowBack={false}
        footer={
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
        }
      >
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
      </ZonePage>
      <CustomTabBar activeTabKey='pages/activity-zone/index' onSwitch={(url) => Taro.switchTab({ url })} />
    </View>
  )
}
