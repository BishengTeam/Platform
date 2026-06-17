import { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { PriceRow } from '@/components/PriceRow'
import { STRINGS } from '@/constants/strings'
import { getCourseById, enrollCourse } from '@/services/dataService'
import { formatPrice, formatCategory } from '@/utils/format'
import type { CourseDetail } from '@/types'
import styles from './detail.module.scss'

export default function CourseDetailPage() {
  const [courseId, setCourseId] = useState('')
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [enrolling, setEnrolling] = useState(false)

  useLoad((options) => {
    setCourseId(options?.id || '')
  })

  useEffect(() => {
    if (!courseId) {
      setLoading(false)
      return
    }
    const id = Number(courseId)
    if (Number.isNaN(id)) {
      setError(STRINGS.COURSE_NOT_FOUND)
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    getCourseById(id)
      .then((data) => {
        if (data) {
          setCourse(data)
        } else {
          setError(STRINGS.COURSE_NOT_FOUND)
        }
      })
      .catch((err) => {
        console.error('[CourseDetail] fetch error:', err)
        setError(err?.message || STRINGS.COURSE_NOT_FOUND)
      })
      .finally(() => setLoading(false))
  }, [courseId])

  const handleEnroll = async () => {
    if (!course || enrolling) return
    const id = Number(courseId)
    if (Number.isNaN(id)) return

    setEnrolling(true)
    try {
      await enrollCourse(id)
      Taro.showToast({ title: STRINGS.COURSE_ENROLL_SUCCESS, icon: 'success' })
    } catch (err: any) {
      console.error('[CourseDetail] enroll error:', err)
      Taro.showToast({
        title: err?.message || '报名失败，请稍后重试',
        icon: 'none',
      })
    } finally {
      setEnrolling(false)
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.COURSE_DETAIL_TITLE} shouldShowBack />
          <View className={styles.empty}>
            <Text>加载中...</Text>
          </View>
        </View>
      </AuthGuard>
    )
  }

  if (error || !course) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.COURSE_DETAIL_TITLE} shouldShowBack />
          <View className={styles.empty}>
            <Text>{error || STRINGS.COURSE_NOT_FOUND}</Text>
          </View>
        </View>
      </AuthGuard>
    )
  }

  const displayPrice = formatPrice(course.price)

  // 解析 batches dict 为展示用列表
  const batchEntries = course.batches ? Object.entries(course.batches) : []

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.COURSE_DETAIL_TITLE} shouldShowBack />
        <ScrollView className={styles.body} scrollY>
          {/* 封面区域 */}
          <View className={styles.coverPlaceholder}>
            <Text className={styles.coverText}>{course.title}</Text>
          </View>

          {/* 基本信息卡片 */}
          <View className={styles.infoCard}>
            <Text className={styles.title}>{course.title}</Text>
            {course.description && (
              <Text className={styles.description}>{course.description}</Text>
            )}

            <View className={styles.metaRow}>
              {course.teacher_name && (
                <View className={styles.metaItem}>
                  <Text className={styles.metaLabel}>{STRINGS.COURSE_INSTRUCTOR}</Text>
                  <Text className={styles.metaValue}>{course.teacher_name}</Text>
                </View>
              )}
              {course.category && (
                <View className={styles.metaItem}>
                  <Text className={styles.metaLabel}>分类</Text>
                  <Text className={styles.metaValue}>{formatCategory(course.category)}</Text>
                </View>
              )}
            </View>
          </View>

          {/* 班次信息 */}
          {batchEntries.length > 0 && (
            <View className={styles.section}>
              <Text className={styles.sectionTitle}>{STRINGS.COURSE_SESSIONS}</Text>
              <View className={styles.sessionList}>
                {batchEntries.map(([key, val]) => (
                  <View key={key} className={styles.sessionItem}>
                    <View className={styles.sessionInfo}>
                      <Text className={styles.sessionLabel}>{key}</Text>
                    </View>
                    <Text className={styles.sessionPrice}>
                      {typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 课程描述 */}
          {course.description && (
            <View className={styles.section}>
              <Text className={styles.sectionTitle}>{STRINGS.COURSE_DESCRIPTION}</Text>
              <Text className={styles.descText}>{course.description}</Text>
            </View>
          )}

          {/* 讲师联系方式 */}
          {course.teacher_contact && (
            <View className={styles.section}>
              <Text className={styles.sectionTitle}>联系方式</Text>
              <Text className={styles.descText}>{course.teacher_contact}</Text>
            </View>
          )}

          {/* 价格与报名 */}
          <View className={styles.priceCard}>
            <PriceRow label={STRINGS.FORM_PRICE_TOTAL} value={displayPrice} isTotal />
          </View>

          <View className={styles.btnWrap}>
            <Button
              variant='gradient'
              size='lg'
              onClick={handleEnroll}
              loading={enrolling}
              disabled={enrolling}
            >
              {STRINGS.COURSE_ENROLL_BTN}
            </Button>
          </View>
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
