import { useCallback, useEffect, useRef, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { RefreshableScrollView } from '@/components/RefreshableScrollView'
import { h3cService } from '@/services/h3cService'
import type { CertificationVendor } from '@/services/certificationJourney'
import type {
  H3cExamAttachment,
  H3cExamBooking,
  H3cExamScheduleOption,
  H3cExamTimeSlot,
} from '@/types/h3c'
import { serverNow } from '@/utils/timeSync'
import { resolveUrl } from '@/utils/request'
import { createLatestGuard } from '@/utils/latestRequest'
import { applyBookingOverview } from '@/utils/examBookingOverview'
import { bookingSubmitState } from '@/utils/bookingSubmit'
import styles from './index.module.scss'

const DAY_MS = 24 * 60 * 60 * 1000
const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const VENDOR_LABELS: Record<CertificationVendor, string> = {
  h3c: 'H3C',
  sangfor: '深信服',
  nisp: 'NISP',
  renshe: '职业技能等级认证',
}

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
  const [vendor, setVendor] = useState<CertificationVendor>('h3c')
  const [registrationId, setRegistrationId] = useState(0)
  const [schedules, setSchedules] = useState<H3cExamScheduleOption[]>([])
  const [bookings, setBookings] = useState<H3cExamBooking[]>([])
  const [scheduleId, setScheduleId] = useState(0)
  const [dates, setDates] = useState<string[]>([])
  const [examDate, setExamDate] = useState('')
  const [slots, setSlots] = useState<H3cExamTimeSlot[]>([])
  const [slotId, setSlotId] = useState(0)
  const [notice, setNotice] = useState('')
  const [attachments, setAttachments] = useState<H3cExamAttachment[]>([])
  const [downloadingAttachment, setDownloadingAttachment] = useState(0)
  const [loading, setLoading] = useState(false)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [datesLoading, setDatesLoading] = useState(false)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [scheduleError, setScheduleError] = useState('')
  const [bookingError, setBookingError] = useState('')
  const [datesError, setDatesError] = useState('')
  const [slotsError, setSlotsError] = useState('')
  const [noticeError, setNoticeError] = useState('')
  const [actionError, setActionError] = useState('')
  const [optimisticBooking, setOptimisticBooking] = useState<H3cExamBooking | null>(null)
  const [justBooked, setJustBooked] = useState(false)
  const datesGuard = useRef(createLatestGuard())
  const slotsGuard = useRef(createLatestGuard())
  const noticeGuard = useRef(createLatestGuard())
  const attachmentsGuard = useRef(createLatestGuard())
  const overviewGuard = useRef(createLatestGuard())

  useLoad(options => {
    const vendorParam = options?.vendor === 'sangfor' ? 'sangfor' : 'h3c'
    setVendor(vendorParam)
    const id = Number(options?.registration_id || 0)
    if (Number.isSafeInteger(id) && id > 0) setRegistrationId(id)
    else setScheduleError('报名记录参数无效，请返回我的报名重试')
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
  const submitState = bookingSubmitState({
    hasSelectedSlot: Boolean(selectedSlot),
    hasCurrentBooking: Boolean(currentBooking),
    submitting,
    bookingError,
    bookingLoading,
  })

  const loadOverview = useCallback(async () => {
    if (!registrationId) return
    const token = overviewGuard.current.next()
    setLoading(true)
    setBookingLoading(true)
    setScheduleError('')
    setBookingError('')
    const [scheduleResult, bookingResult] = await Promise.allSettled([
      h3cService.listExamSchedules(registrationId, vendor),
      h3cService.listExamBookings(vendor),
    ])
    if (!overviewGuard.current.isCurrent(token)) return
    if (scheduleResult.status === 'fulfilled') {
      const scheduleRows = scheduleResult.value
      setSchedules(scheduleRows)
      setScheduleId(old => (scheduleRows.some(item => item.id === old) ? old : 0))
    } else {
      const reason = scheduleResult.reason
      setScheduleError(reason instanceof Error ? reason.message : '考场计划加载失败')
    }
    if (bookingResult.status === 'fulfilled') {
      const next = applyBookingOverview(
        bookingResult.value,
        registrationId,
        optimisticBooking,
      )
      setBookings(next.bookings)
      setOptimisticBooking(next.optimistic)
    } else {
      // 预约记录是次要数据：失败只影响当前预约卡片，不阻断选择考场。
      setBookingError('预约记录加载失败，可继续选择考场或稍后重试')
    }
    setLoading(false)
    setBookingLoading(false)
  }, [registrationId, vendor, optimisticBooking])

  useEffect(() => { void loadOverview() }, [loadOverview])

  const noticeScheduleId = scheduleId || currentBooking?.schedule_id || 0

  const loadNotice = useCallback(async () => {
    const token = noticeGuard.current.next()
    if (!noticeScheduleId) {
      setNotice('')
      setNoticeError('')
      return
    }
    setNoticeError('')
    try {
      const value = await h3cService.getExamNotice(noticeScheduleId, vendor)
      if (noticeGuard.current.isCurrent(token)) setNotice(value)
    } catch {
      if (!noticeGuard.current.isCurrent(token)) return
      // 须知是次要信息，失败不清空日期或阻断预约。
      setNoticeError('考前注意事项加载失败，可稍后重试')
    }
  }, [noticeScheduleId, vendor])

  const loadDates = useCallback(async () => {
    if (!scheduleId) return
    const token = datesGuard.current.next()
    setDatesLoading(true)
    setDatesError('')
    try {
      const rows = await h3cService.listExamDates(scheduleId, vendor)
      if (datesGuard.current.isCurrent(token)) setDates(rows)
    } catch (reason) {
      if (!datesGuard.current.isCurrent(token)) return
      setDates([])
      setDatesError(reason instanceof Error ? reason.message : '可预约日期加载失败')
    } finally {
      if (datesGuard.current.isCurrent(token)) setDatesLoading(false)
    }
  }, [scheduleId, vendor])

  const loadSlots = useCallback(async () => {
    if (!scheduleId || !examDate || !registrationId) return
    const token = slotsGuard.current.next()
    setSlotsLoading(true)
    setSlotsError('')
    try {
      const rows = await h3cService.listExamSlots(scheduleId, examDate, registrationId, vendor)
      if (slotsGuard.current.isCurrent(token)) setSlots(rows)
    } catch (reason) {
      if (!slotsGuard.current.isCurrent(token)) return
      setSlots([])
      setSlotsError(reason instanceof Error ? reason.message : '考试时段加载失败')
    } finally {
      if (slotsGuard.current.isCurrent(token)) setSlotsLoading(false)
    }
  }, [scheduleId, examDate, registrationId, vendor])

  const loadAttachments = useCallback(async () => {
    const token = attachmentsGuard.current.next()
    if (!scheduleId) {
      setAttachments([])
      return
    }
    try {
      const rows = await h3cService.listExamAttachments(scheduleId, vendor)
      if (attachmentsGuard.current.isCurrent(token)) setAttachments(rows)
    } catch {
      if (attachmentsGuard.current.isCurrent(token)) setAttachments([])
    }
  }, [scheduleId, vendor])

  useEffect(() => {
    // 切换计划立即清空旧须知，避免新请求返回前展示上一计划的注意事项。
    setNotice('')
    setNoticeError('')
    void loadNotice()
  }, [loadNotice])

  useEffect(() => {
    if (!justBooked) return
    const timer = setTimeout(() => setJustBooked(false), 1800)
    return () => clearTimeout(timer)
  }, [justBooked])

  useEffect(() => {
    attachmentsGuard.current.invalidate()
    setAttachments([])
    setDates([])
    setExamDate('')
    setSlots([])
    setSlotId(0)
    void loadDates()
  }, [loadDates])

  useEffect(() => { void loadAttachments() }, [loadAttachments])

  useEffect(() => {
    setSlots([])
    setSlotId(0)
    void loadSlots()
  }, [loadSlots])

  const chooseSchedule = (id: number) => {
    if (submitting || id === scheduleId) return
    setScheduleId(id)
    setActionError('')
  }

  const chooseDate = (value: string) => {
    if (submitting || value === examDate) return
    setExamDate(value)
    setActionError('')
  }

  const chooseSlot = (id: number, remaining: number) => {
    if (submitting || remaining === 0) return
    setSlotId(id)
    setActionError('')
  }

  const book = async () => {
    if (
      !registrationId || !scheduleId || !examDate || !slotId
      || submitting || currentBooking || bookingError || bookingLoading
    ) return
    setSubmitting(true)
    setActionError('')
    try {
      const result = await h3cService.bookExamSeat(
        scheduleId,
        registrationId,
        slotId,
        examDate,
        vendor,
      )
      const booked: H3cExamBooking = {
        id: result.booking_id,
        registration_id: registrationId,
        schedule_id: scheduleId,
        schedule_name: schedule?.name || '',
        exam_location: schedule?.exam_location || null,
        subject_name: '',
        slot_label: selectedSlot?.label || '',
        slot_time: selectedSlot?.start_time || '',
        exam_date: result.exam_date || examDate,
        status: 'booked',
      }
      // 让仍在途的旧总览响应失效，避免成功预约被回滚成“未预约”。
      overviewGuard.current.invalidate()
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
      setActionError(message)
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
    setActionError('')
    try {
      await h3cService.cancelExamBooking(
        booking.id,
        booking.registration_id,
        vendor,
      )
      setOptimisticBooking(previous => previous?.id === booking.id ? null : previous)
      setJustBooked(false)
      Taro.showToast({ title: '已取消预约', icon: 'success' })
      await loadOverview()
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : '取消失败，请重试'
      setActionError(message)
      Taro.showToast({ title: message, icon: 'none', duration: 3000 })
    } finally {
      setSubmitting(false)
    }
  }

  return <AuthGuard>
    <View className={styles.page}>
      <PageHeader
        title={currentBooking ? '考试安排' : `${VENDOR_LABELS[vendor]} 考试预约`}
        shouldShowBack
      />
      <RefreshableScrollView
        className={styles.body}
        onRefresh={loadOverview}
        scrollIntoView={justBooked ? 'booking-summary' : ''}
      >
        {loading && <Text className={styles.hint}>正在加载考场计划…</Text>}
        {scheduleError && (
          <View className={styles.errorCard}>
            <Text className={styles.error}>{scheduleError}</Text>
            <Button size='sm' variant='secondary' onClick={() => void loadOverview()}>重新加载考场计划</Button>
          </View>
        )}
        {bookingError && (
          <View className={styles.noticeCard}>
            <Text className={styles.noticeText}>{bookingError}</Text>
            <Button size='sm' variant='secondary' onClick={() => void loadOverview()}>重试预约记录</Button>
          </View>
        )}
        {actionError && <Text className={styles.error}>{actionError}</Text>}

        {currentBooking ? (
          <View
            id='booking-summary'
            className={`${styles.card} ${justBooked ? styles.bookingHighlight : ''}`}
          >
            <View className={styles.bookingSuccessHeader}>
              <Text className={styles.successIcon}>✅</Text>
              <Text className={styles.successTitle}>{justBooked ? '预约成功' : '已预约'}</Text>
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
            <View className={styles.detailRow}>
              <Text className={styles.detailLabel}>考试地点</Text>
              <Text className={styles.detailValue}>
                {currentBooking.exam_location || '待公布'}
              </Text>
            </View>

            {notice && (
              <View className={styles.noticeCard}>
                <Text className={styles.noticeTitle}>考前注意事项</Text>
                <Text className={styles.noticeText}>{notice}</Text>
              </View>
            )}
            {noticeError && (
              <View className={styles.noticeCard}>
                <Text className={styles.noticeText}>{noticeError}</Text>
                <Button size='sm' variant='secondary' onClick={() => void loadNotice()}>重试注意事项</Button>
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
              {attachments.length > 0 && (
                <View className={styles.attachmentList}>
                  <Text className={styles.stepTitle}>📎 考试资料</Text>
                  {attachments.map(item => (
                    <View
                      key={item.id}
                      className={styles.attachmentItem}
                      aria-role='button'
                      aria-label={`下载${item.title}`}
                      onClick={() => {
                        if (downloadingAttachment) return
                        setDownloadingAttachment(item.id)
                        void Taro.downloadFile({ url: resolveUrl(item.file_url) })
                          .then(result => Taro.openDocument({ filePath: result.tempFilePath }))
                          .catch(() => Taro.showToast({ title: '下载失败，请稍后重试', icon: 'none' }))
                          .finally(() => setDownloadingAttachment(0))
                      }}
                    >
                      <Text>{item.title}</Text>
                      <Text className={styles.hint}>
                        {downloadingAttachment === item.id ? '下载中…' : '点击下载'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {!loading && !scheduleError && schedules.length === 0 && (
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
                    aria-role='button'
                    aria-label={`选择考场计划 ${item.name}`}
                    aria-selected={item.id === scheduleId}
                    onClick={() => chooseSchedule(item.id)}
                  >
                    <Text className={styles.optionTitle}>{item.name}</Text>
                    <Text className={styles.optionText}>
                      {displayDate(item.open_date_start)} ~ {displayDate(item.open_date_end)}
                    </Text>
                    {item.exam_location && (
                      <Text className={styles.optionText}>{item.exam_location}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {scheduleId > 0 && (
              <View className={styles.card}>
                <Text className={styles.stepTitle}>② 选择考试日期</Text>
                {datesLoading && <Text className={styles.hint}>正在加载可预约日期…</Text>}
                {!datesLoading && datesError && (
                  <View>
                    <Text className={styles.error}>{datesError}</Text>
                    <Button size='sm' variant='secondary' onClick={() => void loadDates()}>重试日期</Button>
                  </View>
                )}
                {!datesLoading && !datesError && dates.length === 0 && (
                  <Text className={styles.hint}>当前考场计划暂无可预约日期。</Text>
                )}
                <View className={styles.dateGrid}>
                  {dates.map(item => (
                    <View
                      key={item}
                      className={`${styles.dateItem} ${item === examDate ? styles.active : ''}`}
                      aria-role='button'
                      aria-label={`选择考试日期 ${displayDate(item)}`}
                      aria-selected={item === examDate}
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
                {!slotsLoading && slotsError && (
                  <View>
                    <Text className={styles.error}>{slotsError}</Text>
                    <Button size='sm' variant='secondary' onClick={() => void loadSlots()}>重试时段</Button>
                  </View>
                )}
                {!slotsLoading && !slotsError && slots.length === 0 && (
                  <Text className={styles.hint}>该日期暂无可预约时段，请更换日期或考场计划。</Text>
                )}
                {slots.map(item => {
                  const disabled = item.remaining === 0
                  return (
                    <View
                      key={item.slot_id}
                      className={`${styles.option} ${item.slot_id === slotId ? styles.active : ''} ${disabled ? styles.disabled : ''}`}
                      aria-role='button'
                      aria-label={`选择考试时段 ${item.label}`}
                      aria-selected={item.slot_id === slotId}
                      aria-disabled={disabled}
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
                    disabled={submitState.disabled}
                    loading={submitting}
                    onClick={() => void book()}
                  >
                    {submitState.label}
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
            {scheduleId > 0 && noticeError && (
              <View className={styles.card}>
                <Text className={styles.stepTitle}>📋 考前注意事项</Text>
                <Text className={styles.error}>{noticeError}</Text>
                <Button size='sm' variant='secondary' onClick={() => void loadNotice()}>重试注意事项</Button>
              </View>
            )}
          </>
        )}
      </RefreshableScrollView>
    </View>
  </AuthGuard>
}
