import { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { PriceRow } from '@/components/PriceRow'
import { STRINGS } from '@/constants/strings'
import { getCourseById } from '@/services/dataService'
import type { CourseSession } from '@/types'
import styles from './detail.module.scss'

export default function CourseDetailPage() {
  const [courseId, setCourseId] = useState('')
  const [selectedSession, setSelectedSession] = useState<CourseSession | null>(null)

  useLoad((options) => {
    setCourseId(options?.id || '')
  })

  const [course, setCourse] = useState(null)
  useEffect(() => {
    if (courseId) getCourseById(courseId).then(setCourse)
  }, [courseId])

  const handleEnroll = () => {
    if (!course) return
    if (course.sessions.length > 0 && !selectedSession) {
      Taro.showToast({ title: STRINGS.COURSE_SELECT_SESSION_TOAST, icon: 'none' })
      return
    }
    Taro.showToast({ title: STRINGS.COURSE_ENROLL_SUCCESS, icon: 'success' })
  }

  if (!course) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.COURSE_DETAIL_TITLE} shouldShowBack />
          <View className={styles.empty}><Text>{STRINGS.COURSE_NOT_FOUND}</Text></View>
        </View>
      </AuthGuard>
    )
  }

  const displayPrice = selectedSession ? selectedSession.price : course.price

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.COURSE_DETAIL_TITLE} shouldShowBack />
        <ScrollView className={styles.body} scrollY>
          <View className={styles.coverPlaceholder}>
            <Text className={styles.coverText}>{course.title}</Text>
          </View>

          <View className={styles.infoCard}>
            <Text className={styles.title}>{course.title}</Text>
            <Text className={styles.description}>{course.description}</Text>

            <View className={styles.metaRow}>
              <View className={styles.metaItem}>
                <Text className={styles.metaLabel}>{STRINGS.COURSE_INSTRUCTOR}</Text>
                <Text className={styles.metaValue}>{course.instructor}</Text>
              </View>
              <View className={styles.metaItem}>
                <Text className={styles.metaLabel}>{STRINGS.COURSE_HOURS}</Text>
                <Text className={styles.metaValue}>{course.duration}</Text>
              </View>
              <View className={styles.metaItem}>
                <Text className={styles.metaLabel}>{STRINGS.COURSE_RATING}</Text>
                <Text className={styles.metaValue}>{course.rating} ({course.reviewCount}{STRINGS.COURSE_REVIEWS})</Text>
              </View>
            </View>
          </View>

          {course.sessions.length > 0 && (
            <View className={styles.section}>
              <Text className={styles.sectionTitle}>{STRINGS.COURSE_SESSIONS}</Text>
              <View className={styles.sessionList}>
                {course.sessions.map(s => (
                  <View
                    key={s.id}
                    className={`${styles.sessionItem} ${selectedSession?.id === s.id ? styles.sessionActive : ''}`}
                    onClick={() => setSelectedSession(s)}
                  >
                    <View className={styles.sessionInfo}>
                      <Text className={styles.sessionLabel}>{s.label}</Text>
                      <Text className={styles.sessionDate}>{s.startDate} ~ {s.endDate}</Text>
                    </View>
                    <Text className={styles.sessionPrice}>¥{s.price}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View className={styles.section}>
            <Text className={styles.sectionTitle}>{STRINGS.COURSE_DESCRIPTION}</Text>
            <Text className={styles.descText}>{course.description}</Text>
          </View>

          {course.reviews.length > 0 && (
            <View className={styles.section}>
              <Text className={styles.sectionTitle}>{STRINGS.COURSE_REVIEWS} ({course.reviewCount})</Text>
              {course.reviews.map(r => (
                <View key={r.id} className={styles.reviewCard}>
                  <View className={styles.reviewHeader}>
                    <Text className={styles.reviewUser}>{r.userName}</Text>
                    <Text className={styles.reviewRating}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</Text>
                  </View>
                  <Text className={styles.reviewContent}>{r.content}</Text>
                  <Text className={styles.reviewDate}>{r.createdAt}</Text>
                </View>
              ))}
            </View>
          )}

          <View className={styles.priceCard}>
            <PriceRow label={STRINGS.FORM_PRICE_TOTAL} value={displayPrice} isTotal />
          </View>

          <View className={styles.btnWrap}>
            <Button variant='gradient' size='lg' onClick={handleEnroll}>
              {STRINGS.COURSE_ENROLL_BTN}
            </Button>
          </View>
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
