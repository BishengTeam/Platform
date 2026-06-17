import { useState, useMemo, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { TagFilter } from '@/components/TagFilter'
import { ZoneCard } from '@/components/ZoneCard'
import { STRINGS } from '@/constants/strings'
import { getCourseList, getCourseCategories } from '@/services/dataService'
import { formatPrice, formatCategory, CATEGORY_LABEL_MAP } from '@/utils/format'
import type { CourseBrief } from '@/types'
import styles from './index.module.scss'

export default function CourseIndexPage() {
  const [activeTag, setActiveTag] = useState<string>(STRINGS.COURSE_CATEGORY_ALL)
  const [allCourses, setAllCourses] = useState<CourseBrief[]>([])
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    getCourseList().then(setAllCourses).catch(() => {})
    getCourseCategories().then(setCategories).catch(() => {})
  }, [])

  // 将后端返回的英文 category 转为中文展示标签
  const displayCategories = useMemo(() => {
    if (!categories.length) return [STRINGS.COURSE_CATEGORY_ALL]
    return [
      STRINGS.COURSE_CATEGORY_ALL,
      ...categories.map(cat => formatCategory(cat)),
    ]
  }, [categories])

  const filtered = useMemo(() => {
    if (activeTag === STRINGS.COURSE_CATEGORY_ALL || activeTag === '全部') return allCourses
    // 先从中文标签映射回英文 category，如果 miss 则 activeTag 本身可能就是英文 category
    const cat = CATEGORY_LABEL_MAP[activeTag] || activeTag
    const lower = cat.toLowerCase()
    return allCourses.filter(c => c.category?.toLowerCase() === lower)
  }, [activeTag, allCourses])

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.COURSE_LIST_TITLE} shouldShowBack />
        <View className={styles.body}>
          <View className={styles.filterRow}>
            <TagFilter tags={displayCategories} activeTag={activeTag} onChange={setActiveTag} />
          </View>
          <View className={styles.cardList}>
            {filtered.map(course => (
              <ZoneCard
                key={course.id}
                title={course.title}
                subtitle={[course.teacher_name && `${STRINGS.COURSE_INSTRUCTOR}: ${course.teacher_name}`, course.description].filter(Boolean).join(' | ') || undefined}
                tags={course.category ? [formatCategory(course.category)] : []}
                price={course.price === 0 ? STRINGS.ORDERS_FREE : formatPrice(course.price)}
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