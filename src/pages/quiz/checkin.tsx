import { useState, useEffect, useMemo } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import { getCheckinRecords, submitCheckin } from '@/services/dataService'
import styles from './checkin.module.scss'

const WEEKDAYS = STRINGS.WEEKDAY_LABELS

export default function QuizCheckinPage() {
  const [records, setRecords] = useState<{ date: string; completed: boolean }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  useEffect(() => {
    getCheckinRecords()
      .then(setRecords)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const handleCheckin = () => {
    if (submitting) return
    setSubmitting(true)
    submitCheckin()
      .then(() => getCheckinRecords().then(setRecords))
      .catch(() => Taro.showToast({ title: '打卡失败，请重试', icon: 'none' }))
      .finally(() => setSubmitting(false))
  }

  const todayRecord = records.find(r => r.date === todayStr)
  const streakDays = records.filter(r => r.completed).length

  const calendarDays = useMemo(() => {
    const days: { date: string; day: number; completed: boolean; isToday: boolean; isPast: boolean }[] = []
    const start = new Date(today)
    start.setDate(start.getDate() - 29)

    for (let i = 0; i < 30; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const record = records.find(r => r.date === dateStr)
      days.push({
        date: dateStr,
        day: d.getDate(),
        completed: record?.completed || false,
        isToday: dateStr === todayStr,
        isPast: d <= today,
      })
    }
    return days
  }, [records, todayStr])

  const completedDays = calendarDays.filter(d => d.completed).length

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.QUIZ_CHECKIN_CALENDAR} shouldShowBack />
        <View className={styles.body}>
          <View className={styles.statsCard}>
            <View className={styles.statItem}>
              <Text className={styles.statValue}>{loading ? '-' : streakDays}</Text>
              <Text className={styles.statLabel}>{STRINGS.QUIZ_CHECKIN_STATS_STREAK}</Text>
            </View>
            <View className={styles.statDivider} />
            <View className={styles.statItem}>
              <Text className={styles.statValue}>{loading ? '-' : completedDays}</Text>
              <Text className={styles.statLabel}>{STRINGS.QUIZ_CHECKIN_STATS_TOTAL}</Text>
            </View>
            <View className={styles.statDivider} />
            <View className={styles.statItem}>
              <Text className={styles.statValue}>{loading ? '-' : completedDays * 10}</Text>
              <Text className={styles.statLabel}>{STRINGS.QUIZ_CHECKIN_STATS_QUESTIONS}</Text>
            </View>
          </View>

          <View className={styles.calendarCard}>
            <Text className={styles.calendarTitle}>
              {today.getFullYear()}{STRINGS.CALENDAR_YEAR_SUFFIX}{today.getMonth() + 1}{STRINGS.CALENDAR_MONTH_SUFFIX}
            </Text>

            <View className={styles.weekdayRow}>
              {WEEKDAYS.map(w => (
                <Text key={w} className={styles.weekday}>{w}</Text>
              ))}
            </View>

            <View className={styles.dayGrid}>
              {calendarDays.map(d => (
                <View
                  key={d.date}
                  className={`${styles.dayCell} ${d.completed ? styles.dayCompleted : ''} ${d.isToday ? styles.dayToday : ''}`}
                >
                  <Text className={`${styles.dayText} ${!d.isPast ? styles.dayFuture : ''}`}>
                    {d.day}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {!loading && !error && (
            <View className={styles.btnWrap}>
              <Button
                variant='gradient'
                size='lg'
                disabled={todayRecord?.completed || submitting}
                onClick={handleCheckin}
              >
                {submitting ? '打卡中...' : todayRecord?.completed ? STRINGS.QUIZ_CHECKIN_TODAY : STRINGS.QUIZ_CHECKIN_BTN}
              </Button>
            </View>
          )}
        </View>
      </View>
    </AuthGuard>
  )
}