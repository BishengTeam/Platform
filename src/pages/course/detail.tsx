import { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { PriceRow } from '@/components/PriceRow'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import { getCourseById, purchaseCourse, prepayOrder, pollCourseAccess } from '@/services/dataService'
import { formatCategory } from '@/utils/format'
import type { CourseDetail, CoursePurchaseResponse } from '@/types'
import styles from './detail.module.scss'

export default function CourseDetailPage() {
  const [courseId, setCourseId] = useState('')
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [purchasing, setPurchasing] = useState(false)

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
        setError(STRINGS.COURSE_LOAD_ERROR)
      })
      .finally(() => setLoading(false))
  }, [courseId])

  const enterContent = (id: number) => {
    Taro.navigateTo({ url: `/${ROUTES.COURSE_CONTENT}?id=${id}` })
  }

  const handlePurchaseResult = async (
    id: number,
    result: CoursePurchaseResponse,
  ) => {
    if (result.learning_access) {
      Taro.showToast({ title: STRINGS.COURSE_ENROLL_SUCCESS, icon: 'success' })
      enterContent(id)
      return
    }

    if (!result.payment_required || !result.order_id) {
      throw new Error('返回的支付信息不完整')
    }

    const prepay = await prepayOrder(Number(result.order_id))
    if (!prepay?.time_stamp) {
      throw new Error('微信支付参数获取失败')
    }

    try {
      await Taro.requestPayment({
        timeStamp: prepay.time_stamp,
        nonceStr: prepay.nonce_str,
        package: prepay.package,
        signType: prepay.sign_type as 'MD5' | 'HMAC-SHA256',
        paySign: prepay.pay_sign,
      })
    } catch (err: any) {
      if (err?.errMsg?.includes('cancel')) {
        Taro.showToast({ title: STRINGS.COURSE_PAYMENT_CANCELLED, icon: 'none' })
        return
      }
      throw err
    }

    Taro.showLoading({ title: STRINGS.COURSE_PAYMENT_CONFIRMING, mask: true })
    try {
      const access = await pollCourseAccess(id)
      Taro.hideLoading()
      if (access) {
        Taro.showToast({ title: STRINGS.COURSE_ENROLL_SUCCESS, icon: 'success' })
        enterContent(id)
      } else {
        Taro.showToast({ title: STRINGS.COURSE_PAYMENT_TIMEOUT, icon: 'none' })
      }
    } catch (pollErr) {
      Taro.hideLoading()
      throw pollErr
    }
  }

  const handleAction = async () => {
    if (!course || purchasing) return
    const id = Number(courseId)
    if (Number.isNaN(id)) return

    if (course.has_access) {
      enterContent(id)
      return
    }

    setPurchasing(true)
    try {
      const result = await purchaseCourse(id)
      await handlePurchaseResult(id, result)
    } catch (err: any) {
      console.error('[CourseDetail] purchase error:', err)
      Taro.showToast({
        title: err?.message || STRINGS.COURSE_PURCHASE_FAILED,
        icon: 'none',
      })
    } finally {
      setPurchasing(false)
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

  const displayPrice = Number(course.price) / 100
  const isPaidCourse = Number(course.price) > 0
  const buttonText = course.has_access
    ? STRINGS.COURSE_LEARN_BTN
    : isPaidCourse
      ? STRINGS.COURSE_BUY_BTN
      : STRINGS.COURSE_ENROLL_BTN

  const scheduleEntries = course.batches ? Object.entries(course.batches) : []

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

          {/* 上课安排 */}
          {scheduleEntries.length > 0 && (
            <View className={styles.section}>
              <Text className={styles.sectionTitle}>{STRINGS.COURSE_SCHEDULE}</Text>
              <View className={styles.sessionList}>
                {scheduleEntries.map(([id, schedule]) => (
                  <View key={id} className={styles.sessionItem}>
                    <View className={styles.sessionInfo}>
                      <Text className={styles.sessionLabel}>{schedule.class_date}</Text>
                      <Text className={styles.sessionDate}>
                        {schedule.start_time} - {schedule.end_time}
                      </Text>
                      {schedule.location && (
                        <Text className={styles.sessionLocation}>{schedule.location}</Text>
                      )}
                    </View>
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
          {!course.has_access && (
            <View className={styles.priceCard}>
              <PriceRow label={STRINGS.FORM_PRICE_TOTAL} value={displayPrice} isTotal />
            </View>
          )}

          <View className={styles.btnWrap}>
            <Button
              variant='gradient'
              size='lg'
              onClick={handleAction}
              loading={purchasing}
              disabled={purchasing}
            >
              {buttonText}
            </Button>
          </View>
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
