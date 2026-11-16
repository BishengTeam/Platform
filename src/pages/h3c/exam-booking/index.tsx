import { useCallback, useEffect, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { RefreshableScrollView } from '@/components/RefreshableScrollView'
import { h3cService } from '@/services/h3cService'
import type { H3cExamBooking, H3cExamScheduleOption, H3cExamTimeSlot } from '@/types/h3c'
import { serverNow } from '@/utils/timeSync'
import styles from './index.module.scss'

const DAY_MS = 24 * 60 * 60 * 1000
const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function displayDate(value: string) {
  return value.slice(0, 10)
}

function weekdayLabel(value: string) {
  const time = Date.parse(`${displayDate(value)}T00:00:00Z`)
  return Number.isFinite(time)
    ? WEEKDAY_LABELS[new Date(time).getUTCDay()]
    : ''
}

function canCancelBooking(examDate: string) {
  const examTime = Date.parse(`${examDate.slice(0, 10)}T00:00:00Z`)
  if (!Number.isFinite(examTime)) return false
  const deadlineDay = new Date(examTime - 3 * DAY_MS)
  const cutoff = Date.UTC(
    deadlineDay.getUTCFullYear(),
    deadlineDay.getUTCMonth(),
    deadlineDay.getUTCDate() + 1,
  )
  return serverNow() < cutoff
}

export default function H3cExamBookingPage() {
  const [registrationId, setRegistrationId] = useState(0)
  const [schedules, setSchedules] = useState<H3cExamScheduleOption[]>([])
  const [bookings, setBookings] = useState<H3cExamBooking[]>([])
  const [scheduleId, setScheduleId] = useState(0)
  const [dates, setDates] = useState<string[]>([])
  const [examDate, setExamDate] = useState('')
  const [slots, setSlots] = useState<H3cExamTimeSlot[]>([])
  const [slotId, setSlotId] = useState(0)
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [datesLoading, setDatesLoading] = useState(false)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [optimisticBooking, setOptimisticBooking] = useState<H3cExamBooking | null>(null)
  const [justBooked, setJustBooked] = useState(false)

  useLoad(options => {
    const id = Number(options?.registration_id || 0)
    if (Number.isSafeInteger(id) && id > 0) setRegistrationId(id)
    else setError('报名记录参数无效，请返回我的报名重试')
  })

  const schedule = schedules.find(item => item.id === scheduleId) || null
  const selectedSlot = slots.find(item => item.slot_id === slotId) || null
  const exactBooking = bookings.find(
    item => item.registration_id === registrationId && item.status === 'booked'
  ) || null
  const listHasRegistrationIds = bookings.some(
    item => Number.isSafeInteger(item.registration_id)
  )
  // Older booking-list payloads did not expose registration_id. In that case a
  // user with one active booking can safely fall back to that row. New payloads
  // keep the scope exact because a multi-product user may book two subjects.
  const legacyActiveBooking = listHasRegistrationIds || bookings.length === 0
    ? null
    : bookings.find(item => item.status === 'booked') || null
  const currentBooking = exactBooking || optimisticBooking || legacyActiveBooking

  const loadOverview = useCallback(async () => {
    if (!registrationId) return
    setLoading(true)
    setError('')
    try {
      const [scheduleRows, bookingRows] = await Promise.all([
        h3cService.listExamSchedules(registrationId),
        h3cService.listExamBookings(),
      ])
      setSchedules(scheduleRows)
      setBookings(bookingRows)
      const rowsHaveRegistrationIds = bookingRows.some(
        item => Number.isSafeInteger(item.registration_id)
      )
      const hasActiveBookingForThisRegistration = bookingRows.some(
        item => item.registration_id === registrationId && item.status === 'booked'
      )
      if (rowsHaveRegistrationIds && !hasActiveBookingForThisRegistration) {
        setOptimisticBooking(null)
      }
      setScheduleId(old => (scheduleRows.some(item => item.id === old) ? old : 0))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '考场计划加载失败')
    } finally {
      setLoading(false)
    }
  }, [registrationId])

  useEffect(() => { void loadOverview() }, [loadOverview])

  useEffect(() => {
    const bookedScheduleId = currentBooking?.schedule_id
    if (!bookedScheduleId) return
    let cancelled = false
    h3cService.getExamNotice(bookedScheduleId)
      .then(value => {
        if (!cancelled) setNotice(value)
      })
      .catch(reason => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '考前注意事项加载失败')
      })
    return () => { cancelled = true }
  }, [currentBooking?.schedule_id])

  useEffect(() => {
    if (!justBooked) return
    const timer = setTimeout(() => setJustBooked(false), 1800)
    return () => clearTimeout(timer)
  }, [justBooked])

  useEffect(() => {
    setDates([])
    setExamDate('')
    setSlots([])
    setSlotId(0)
    setNotice('')
    if (!scheduleId) return

    let cancelled = false
    setDatesLoading(true)
    Promise.all([
      h3cService.listExamDates(scheduleId),
      h3cService.getExamNotice(scheduleId),
    ]).then(([dateRows, noticeText]) => {
      if (cancelled) return
      setDates(dateRows)
      setNotice(noticeText)
    }).catch(reason => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : '可预约日期加载失败')
    }).finally(() => {
      if (!cancelled) setDatesLoading(false)
    })
    return () => { cancelled = true }
  }, [scheduleId])

  useEffect(() => {
    setSlots([])
    setSlotId(0)
    if (!scheduleId || !examDate || !registrationId) return

    let cancelled = false
    setSlotsLoading(true)
    h3cService.listExamSlots(scheduleId, examDate, registrationId)
      .then(rows => {
        if (!cancelled) setSlots(rows)
      })
      .catch(reason => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '考试时段加载失败')
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false)
      })
    return () => { cancelled = true }
  }, [scheduleId, examDate, registrationId])

  const chooseSchedule = (id: number) => {
    if (submitting || id === scheduleId) return
    setScheduleId(id)
    setError('')
  }

  const chooseDate = (value: string) => {
    if (submitting || value === examDate) return
    setExamDate(value)
    setError('')
  }

  const chooseSlot = (id: number, remaining: number) => {
    if (submitting || remaining === 0) return
    setSlotId(id)
    setError('')
  }

  const book = async () => {
    if (!registrationId || !scheduleId || !examDate || !slotId || submitting || currentBooking) return
    setSubmitting(true)
    setError('')
    try {
      const result = await h3cService.bookExamSeat(
        scheduleId,
        registrationId,
        slotId,
        examDate,
      )
      const booked: H3cExamBooking = {
        id: result.booking_id,
        registration_id: registrationId,
        schedule_id: scheduleId,
        schedule_name: schedule?.name || '',
        subject_name: '',
        slot_label: selectedSlot?.label || '',
        slot_time: selectedSlot?.start_time || '',
        exam_date: result.exam_date || examDate,
        status: 'booked',
      }
      setBookings(previous => [
        ...previous.filter(item => item.id !== booked.id),
        booked,
      ])
      setOptimisticBooking(booked)
      setJustBooked(true)
      Taro.showToast({ title: '预约成功', icon: 'success' })
      await loadOverview()
      setSlotId(0)
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : '预约失败，请重试'
      setError(message)
      Taro.showToast({ title: message, icon: 'none', duration: 3000 })
    } finally {
      setSubmitting(false)
    }
  }

  const cancel = async (booking: H3cExamBooking) => {
    if (submitting) return
    const confirmed = await Taro.showModal({
      title: '取消预约',
      content: `确定取消 ${displayDate(booking.exam_date)} ${booking.slot_label} 的考试预约吗？`,
      confirmText: '取消预约',
      cancelText: '暂不取消',
    })
    if (!confirmed.confirm) return

    setSubmitting(true)
    setError('')
    try {
      await h3cService.cancelExamBooking(booking.id, booking.registration_id)
      setOptimisticBooking(previous => previous?.id === booking.id ? null : previous)
      setJustBooked(false)
      Taro.showToast({ title: '已取消预约', icon: 'success' })
      await loadOverview()
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : '取消失败，请重试'
      setError(message)
      Taro.showToast({ title: message, icon: 'none', duration: 3000 })
    } finally {
      setSubmitting(false)
    }
  }

  return <AuthGuard>
    <View className={styles.page}>
      <PageHeader title={currentBooking ? '考试安排' : 'H3C 考试预约'} shouldShowBack />
      <RefreshableScrollView
        className={styles.body}
        onRefresh={loadOverview}
        scrollIntoView={justBooked ? 'booking-summary' : ''}
      >
        {loading && <Text className={styles.hint}>正在加载考场计划…</Text>}
        {error && (
          <View className={styles.errorCard}>
            <Text className={styles.error}>{error}</Text>
            <Button size='sm' variant='secondary' onClick={() => void loadOverview()}>重新加载</Button>
          </View>
        )}

        {currentBooking ? (
          <View
            id='booking-summary'
            className={`${styles.card} ${justBooked ? styles.bookingHighlight : ''}`}
          >
            <View className={styles.bookingSuccessHeader}>
              <Text className={styles.successIcon}>✅</Text>
              <Text className={styles.successTitle}>预约成功</Text>
            </View>
            <View className={styles.detailRow}>
              <Text className={styles.detailLabel}>考试科目</Text>
              <Text className={styles.detailValue}>{currentBooking.subject_name || '-'}</Text>
            </View>
            <View className={styles.detailRow}>
              <Text className={styles.detailLabel}>考试日期</Text>
              <Text className={styles.detailValue}>
                {displayDate(currentBooking.exam_date)}
                {weekdayLabel(currentBooking.exam_date) && `（${weekdayLabel(currentBooking.exam_date)}）`}
              </Text>
            </View>
            <View className={styles.detailRow}>
              <Text className={styles.detailLabel}>考试时段</Text>
              <Text className={styles.detailValue}>
                {currentBooking.slot_label}（{currentBooking.slot_time.slice(0, 5)}）
              </Text>
            </View>
            <View className={styles.detailRow}>
              <Text className={styles.detailLabel}>考场计划</Text>
              <Text className={styles.detailValue}>{currentBooking.schedule_name || '-'}</Text>
            </View>

            {notice && (
              <View className={styles.noticeCard}>
                <Text className={styles.noticeTitle}>考前注意事项</Text>
                <Text className={styles.noticeText}>{notice}</Text>
              </View>
            )}

            {canCancelBooking(currentBooking.exam_date) ? (
              <>
                <Button
                  variant='secondary'
                  disabled={submitting}
                  loading={submitting}
                  onClick={() => void cancel(currentBooking)}
                >取消预约</Button>
                <Text className={styles.hint}>取消后可重新选择其他日期和时段。</Text>
              </>
            ) : (
              <Text className={styles.warning}>考前 3 天内不可自助取消，请联系管理员</Text>
            )}
          </View>
        ) : (
          <>
            <View id='booking-summary' className={styles.card}>
              <Text className={styles.title}>预约说明</Text>
              <Text className={styles.text}>
                报名审核通过后可在此选择考场计划、考试日期和时段。预约成功后，下方显示的日期与时段即为最终考试时间。
              </Text>
            </View>

            {!loading && !error && schedules.length === 0 && (
              <View className={styles.card}>
                <EmptyState title='暂无可预约考场计划' />
              </View>
            )}

            {!loading && schedules.length > 0 && (
              <View className={styles.card}>
                <Text className={styles.stepTitle}>① 选择考场计划</Text>
                {schedules.map(item => (
                  <View
                    key={item.id}
                    className={`${styles.option} ${item.id === scheduleId ? styles.active : ''}`}
                    onClick={() => chooseSchedule(item.id)}
                  >
                    <Text className={styles.optionTitle}>{item.name}</Text>
                    <Text className={styles.optionText}>
                      {displayDate(item.open_date_start)} ~ {displayDate(item.open_date_end)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {scheduleId > 0 && (
              <View className={styles.card}>
                <Text className={styles.stepTitle}>② 选择考试日期</Text>
                {datesLoading && <Text className={styles.hint}>正在加载可预约日期…</Text>}
                {!datesLoading && dates.length === 0 && (
                  <Text className={styles.hint}>当前考场计划暂无可预约日期。</Text>
                )}
                <View className={styles.dateGrid}>
                  {dates.map(item => (
                    <View
                      key={item}
                      className={`${styles.dateItem} ${item === examDate ? styles.active : ''}`}
                      onClick={() => chooseDate(item)}
                    >
                      <Text>{displayDate(item)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {examDate && (
              <View className={styles.card}>
                <Text className={styles.stepTitle}>③ 选择考试时段</Text>
                {slotsLoading && <Text className={styles.hint}>正在加载时段与剩余机位…</Text>}
                {!slotsLoading && slots.length === 0 && (
                  <Text className={styles.hint}>该日期暂无可预约时段，请更换日期或考场计划。</Text>
                )}
                {slots.map(item => {
                  const disabled = item.remaining === 0
                  return (
                    <View
                      key={item.slot_id}
                      className={`${styles.option} ${item.slot_id === slotId ? styles.active : ''} ${disabled ? styles.disabled : ''}`}
                      onClick={() => chooseSlot(item.slot_id, item.remaining)}
                    >
                      <Text className={styles.optionTitle}>
                        {item.label}（{item.start_time.slice(0, 5)}）
                      </Text>
                      <Text className={styles.optionText}>
                        {disabled ? '已满' : item.remaining < 0 ? '余量不限' : `剩余 ${item.remaining} 位`}
                      </Text>
                    </View>
                  )
                })}
                {!slotsLoading && slots.length > 0 && (
                  <Button
                    variant='gradient'
                    disabled={!selectedSlot || Boolean(currentBooking) || submitting}
                    loading={submitting}
                    onClick={() => void book()}
                  >
                    {selectedSlot ? '确认预约' : '请选择考试时段'}
                  </Button>
                )}
              </View>
            )}

            {scheduleId > 0 && notice && (
              <View className={styles.card}>
                <Text className={styles.stepTitle}>📋 考前注意事项</Text>
                <Text className={styles.text}>{notice}</Text>
              </View>
            )}
          </>
        )}
      </RefreshableScrollView>
    </View>
  </AuthGuard>
}
