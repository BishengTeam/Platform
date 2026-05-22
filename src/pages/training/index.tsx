import { useState } from 'react'
import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { ZonePage } from '@/components/ZonePage'
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
    <View className={styles.page}>
      <ZonePage
        title={STRINGS.STUDY_TITLE}
        bannerItems={getStudyBannerItems()}
        tagFilters={TRAINING_TAGS}
        activeTag={activeTag}
        onTagChange={setActiveTag}
        shouldShowBack={false}
      >
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
      </ZonePage>
      <CustomTabBar activeTabKey='pages/training/index' onSwitch={(url) => Taro.switchTab({ url })} />
    </View>
  )
}
