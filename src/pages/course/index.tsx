import { useState, useMemo, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { TagFilter } from '@/components/TagFilter'
import { ZoneCard } from '@/components/ZoneCard'
import { STRINGS } from '@/constants/strings'
import { getCourseList, getCourseCategories } from '@/services/dataService'
import type { Course } from '@/types'
import type { TagFilterItem } from '@/types/registration'
import styles from './index.module.scss'

export default function CourseIndexPage() {
  const [activeTag, setActiveTag] = useState<string>(STRINGS.COURSE_CATEGORY_ALL)
  const [allCourses, setAllCourses] = useState<Course[]>([])
  const [categories, setCategories] = useState<TagFilterItem[]>([])

  useEffect(() => {
    getCourseList().then(setAllCourses).catch(() => {})
    getCourseCategories().then(setCategories).catch(() => {})
  }, [])

  const filtered = useMemo(() => {
    if (activeTag === '全部') return allCourses
    const catMap: Record<string, string> = {
      [STRINGS.STUDY_TAG_BASIC]: 'basic',
      [STRINGS.STUDY_TAG_ADVANCED]: 'advanced',
      [STRINGS.STUDY_TAG_PRACTICAL]: 'practical',
    }
    const cat = catMap[activeTag]
    return cat ? allCourses.filter(c => c.category === cat) : allCourses
  }, [activeTag, allCourses])

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.COURSE_LIST_TITLE} shouldShowBack />
        <View className={styles.body}>
          <View className={styles.filterRow}>
            <TagFilter tags={categories} activeTag={activeTag} onChange={setActiveTag} />
          </View>
          <View className={styles.cardList}>
            {filtered.map(course => (
              <ZoneCard
                key={course.id}
                title={course.title}
                subtitle={`${STRINGS.COURSE_INSTRUCTOR}: ${course.instructor}  |  ${course.duration}`}
                tags={[course.tag, `${STRINGS.COURSE_RATING} ${course.rating}`, `${course.reviewCount}${STRINGS.COURSE_REVIEWS}`]}
                price={course.price === 0 ? STRINGS.ORDERS_FREE : `¥${course.price}`}
                originalPrice={course.originalPrice > 0 ? `¥${course.originalPrice}` : undefined}
                buttonText={STRINGS.COURSE_VIEW_DETAIL}
                onCardClick={() => Taro.navigateTo({ url: `/pages/course/detail?id=${course.id}` })}
              />
            ))}
          </View>
        </View>
      </View>
    </AuthGuard>
  )
}
