import { useMemo, useState } from 'react'
import { Text, View } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import type { QuizCheckinDay, QuizCheckinStatus } from '@/contracts/quiz'
import { getQuizCheckinCalendar, getQuizCheckinStatus } from '@/services/dataService'
import { addCalendarDays, shanghaiDate } from '@/utils/quizRuntime'
import styles from './checkin.module.scss'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

export default function QuizCheckinPage() {
  const [records, setRecords] = useState<QuizCheckinDay[]>([])
  const [status, setStatus] = useState<QuizCheckinStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const today = shanghaiDate()
  const dateFrom = addCalendarDays(today, -29)

  useDidShow(() => {
    setLoading(true)
    setError(false)
    Promise.all([getQuizCheckinStatus(), getQuizCheckinCalendar(dateFrom, today)])
      .then(([nextStatus, days]) => { setStatus(nextStatus); setRecords(days) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  })

  const byDate = useMemo(() => new Map(records.map(record => [record.checkin_date, record])), [records])
  const calendarDays = useMemo(() => Array.from({ length: 30 }, (_, index) => {
    const date = addCalendarDays(dateFrom, index)
    return { date, day: Number(date.slice(-2)), completed: byDate.has(date), isToday: date === today }
  }), [byDate, dateFrom, today])
  const totalQuestions = records.reduce((sum, record) => sum + record.questions_completed, 0)

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='学习打卡' shouldShowBack />
        <View className={styles.body}>
          <View className={styles.notice}><Text>当天首次提交普通练习或错题专项作答后，系统自动打卡；模拟考试不打卡，也无需手工签到。</Text></View>
          <View className={styles.statsCard}>
            <View className={styles.statItem}><Text className={styles.statValue}>{loading ? '-' : status?.consecutive_days ?? 0}</Text><Text className={styles.statLabel}>连续天数</Text></View>
            <View className={styles.statDivider} />
            <View className={styles.statItem}><Text className={styles.statValue}>{loading ? '-' : records.length}</Text><Text className={styles.statLabel}>近 30 天打卡</Text></View>
            <View className={styles.statDivider} />
            <View className={styles.statItem}><Text className={styles.statValue}>{loading ? '-' : totalQuestions}</Text><Text className={styles.statLabel}>近 30 天练习</Text></View>
          </View>

          {error ? <Text className={styles.error}>打卡数据加载失败，请稍后重试</Text> : (
            <View className={styles.calendarCard}>
              <Text className={styles.calendarTitle}>{dateFrom} 至 {today}</Text>
              <View className={styles.weekdayRow}>{WEEKDAYS.map(day => <Text key={day} className={styles.weekday}>{day}</Text>)}</View>
              <View className={styles.dayGrid}>
                {calendarDays.map(day => (
                  <View key={day.date} className={`${styles.dayCell} ${day.completed ? styles.dayCompleted : ''} ${day.isToday ? styles.dayToday : ''}`}>
                    <Text className={styles.dayText}>{day.day}</Text>
                  </View>
                ))}
              </View>
              {!loading && <Text className={styles.todayStatus}>今日：{status?.checked_in ? `已自动打卡，完成 ${status.questions_completed} 次练习作答` : '尚未提交练习作答'}</Text>}
            </View>
          )}
        </View>
      </View>
    </AuthGuard>
  )
}
