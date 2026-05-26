import { useState, useMemo } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { TagFilter } from '@/components/TagFilter'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { STRINGS } from '@/constants/strings'
import { getMyCourses } from '@/services/dataService'
import styles from './courses.module.scss'

const STATUS_TAGS = [STRINGS.MINE_COURSES_ACTIVE, STRINGS.MINE_COURSES_PENDING, STRINGS.MINE_COURSES_EXPIRED]

export default function MyCoursesPage() {
  const [activeStatus, setActiveStatus] = useState(STATUS_TAGS[0])
  const allCourses = getMyCourses()

  const filtered = useMemo(() => {
    const statusMap: Record<string, string> = {
      [STRINGS.MINE_COURSES_ACTIVE]: 'active',
      [STRINGS.MINE_COURSES_PENDING]: 'pending',
      [STRINGS.MINE_COURSES_EXPIRED]: 'expired',
    }
    return allCourses.filter(c => c.status === statusMap[activeStatus])
  }, [activeStatus, allCourses])

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.MINE_COURSES_TITLE} shouldShowBack />
        <View className={styles.body}>
          <View className={styles.filterRow}>
            <TagFilter tags={STATUS_TAGS} activeTag={activeStatus} onChange={setActiveStatus} />
          </View>
          {filtered.length === 0 ? (
            <EmptyState title={STRINGS.MINE_COURSES_EMPTY} />
          ) : (
            <View className={styles.list}>
              {filtered.map(course => (
                <View key={course.id} className={styles.card}>
                  <Text className={styles.courseTitle}>{course.title}</Text>
                  <Text className={styles.courseInstructor}>{STRINGS.COURSE_INSTRUCTOR}: {course.instructor}</Text>
                  <View className={styles.progressRow}>
                    <View className={styles.progressBar}>
                      <View
                        className={`${styles.progressFill} ${course.status === 'expired' ? styles.progressExpired : ''}`}
                        style={{ width: `${course.progress}%` }}
                      />
                    </View>
                    <Text className={styles.progressText}>{course.completedLessons}/{course.totalLessons}{STRINGS.MINE_COURSES_UNIT}</Text>
                  </View>
                  {course.status === 'active' && (
                    <Button size='sm' onClick={() => Taro.navigateTo({ url: `/pages/course/detail?id=${course.id}` })}>
                      {STRINGS.MINE_COURSES_CONTINUE}
                    </Button>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </AuthGuard>
  )
}
