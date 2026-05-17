import { useState } from 'react'
import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { ZoneBanner } from '@/components/ZoneBanner'
import { TagFilter } from '@/components/TagFilter'
import { ZoneCard } from '@/components/ZoneCard'
import { CustomTabBar } from '@/components/TabBar'
import { STRINGS } from '@/constants/strings'
import { getStudyTagFilters, getStudyBannerItems, getCourseList } from '@/services/dataService'
import styles from './index.module.scss'

const TRAINING_TAGS = getStudyTagFilters().map(t => ({
  ...t,
  activeColor: '#722ED1',
  activeBg: '#722ED1',
  inactiveBg: '#F9F0FF',
}))

export default function TrainingPage() {
  const [activeTag, setActiveTag] = useState<string>(STRINGS.STUDY_TAG_ALL)
  const allCourses = getCourseList()
  const courses = activeTag === STRINGS.STUDY_TAG_ALL
    ? allCourses
    : allCourses.slice(0, 3)

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.STUDY_TITLE} />
        <View className={styles.body}>
          <View className={styles.bannerWrap}>
            <ZoneBanner items={getStudyBannerItems()} />
          </View>
          <View className={styles.content}>
            <TagFilter tags={TRAINING_TAGS} activeTag={activeTag} onChange={setActiveTag} />
            <View className={styles.cardList}>
              {courses.map((course) => (
                <ZoneCard
                  key={course.id}
                  title={course.title}
                  subtitle={course.description}
                  tags={[course.tag, course.duration]}
                  price={course.price}
                  originalPrice={course.originalPrice}
                  buttonText={STRINGS.STUDY_ENROLL}
                />
              ))}
            </View>
          </View>
        </View>
        <CustomTabBar activeTabKey='pages/training/index' onSwitch={(url) => Taro.switchTab({ url })} />
      </View>
    </AuthGuard>
  )
}
