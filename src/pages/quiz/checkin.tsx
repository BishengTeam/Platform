import { useCallback, useMemo, useRef, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { ROUTES } from '@/constants/routes'
import type { QuizCheckinDay, QuizCheckinStatus } from '@/contracts/quiz'
import { getQuizCheckinCalendar, getQuizCheckinStatus } from '@/services/dataService'
import { shanghaiDate } from '@/utils/quizRuntime'
import {
  buildCheckinMonthGrid,
  checkinMonthLabel,
  checkinMonthOf,
  checkinMonthRange,
  shiftCheckinMonth,
} from '@/utils/checkinCalendar'
import styles from './checkin.module.scss'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

const RULES = [
  '当天首次提交普通练习或错题专项作答后，系统自动打卡',
  '模拟考试不计入打卡，也无需手工签到',
  '每个自然日首次打卡自动获得 5 积分',
  '连续打卡按自然日计算，中断后重新累计',
]

export default function QuizCheckinPage() {
  const [viewMonth, setViewMonth] = useState(() => checkinMonthOf(shanghaiDate()))
  const [records, setRecords] = useState<QuizCheckinDay[]>([])
  const [status, setStatus] = useState<QuizCheckinStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [rulesVisible, setRulesVisible] = useState(false)
  const today = shanghaiDate()
  const requestToken = useRef(0)

  const loadMonth = useCallback((month: string) => {
    const token = requestToken.current + 1
    requestToken.current = token
    const range = checkinMonthRange(month)
    setLoading(true)
    setError(false)
    Promise.all([getQuizCheckinStatus(), getQuizCheckinCalendar(range.dateFrom, range.dateTo)])
      .then(([nextStatus, days]) => {
        if (token !== requestToken.current) return
        setStatus(nextStatus)
        setRecords(days)
      })
      .catch(() => {
        if (token !== requestToken.current) return
        setError(true)
      })
      .finally(() => {
        if (token !== requestToken.current) return
        setLoading(false)
      })
  }, [])

  useDidShow(() => {
    const month = checkinMonthOf(shanghaiDate())
    setViewMonth(month)
    loadMonth(month)
  })

  const completedDates = useMemo(
    () => new Set(records.map(record => record.checkin_date)),
    [records],
  )
  const calendarCells = useMemo(
    () => buildCheckinMonthGrid(viewMonth, today, completedDates),
    [viewMonth, today, completedDates],
  )
  const totalQuestions = records.reduce((sum, record) => sum + record.questions_completed, 0)

  const switchMonth = useCallback((delta: number) => {
    const next = shiftCheckinMonth(viewMonth, delta)
    setViewMonth(next)
    loadMonth(next)
  }, [loadMonth, viewMonth])

  const goPractice = useCallback(() => {
    Taro.showToast({ title: '完成一次练习即可自动打卡', icon: 'none', duration: 2000 })
    const pages = Taro.getCurrentPages()
    const previous = pages.length > 1 ? pages[pages.length - 2] : undefined
    if (previous?.route === ROUTES.QUIZ_INDEX) Taro.navigateBack()
    else Taro.redirectTo({ url: `/${ROUTES.QUIZ_INDEX}` })
  }, [])

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='学习打卡' shouldShowBack />
        <View className={styles.body}>
          <View className={styles.statsCard}>
            <View className={styles.statItem}><Text className={styles.statValue}>{loading ? '-' : status?.consecutive_days ?? 0}</Text><Text className={styles.statLabel}>连续天数</Text></View>
            <View className={styles.statDivider} />
            <View className={styles.statItem}><Text className={styles.statValue}>{loading ? '-' : records.length}</Text><Text className={styles.statLabel}>本月打卡</Text></View>
            <View className={styles.statDivider} />
            <View className={styles.statItem}><Text className={styles.statValue}>{loading ? '-' : totalQuestions}</Text><Text className={styles.statLabel}>本月练习</Text></View>
          </View>

          {error ? <Text className={styles.error}>打卡数据加载失败，请稍后重试</Text> : (
            <View className={styles.calendarCard}>
              <View className={styles.calendarHeader}>
                <View className={styles.monthArrow} onClick={() => switchMonth(-1)}><Text className={styles.monthArrowIcon}>‹</Text></View>
                <Text className={styles.calendarTitle}>{checkinMonthLabel(viewMonth)}</Text>
                <View className={styles.headerRight}>
                  <View className={styles.monthArrow} onClick={() => switchMonth(1)}><Text className={styles.monthArrowIcon}>›</Text></View>
                  <View className={styles.helpButton} onClick={() => setRulesVisible(true)}><Text className={styles.helpButtonText}>?</Text></View>
                </View>
              </View>
              <View className={styles.weekdayRow}>{WEEKDAYS.map(day => <Text key={day} className={styles.weekday}>{day}</Text>)}</View>
              <View className={styles.dayGrid}>
                {calendarCells.map(cell => (
                  <View
                    key={cell.date}
                    className={[
                      styles.dayCell,
                      cell.inMonth ? '' : styles.dayOtherMonth,
                      cell.completed ? styles.dayCompleted : '',
                      cell.isToday ? styles.dayToday : '',
                      cell.isFuture && cell.inMonth ? styles.dayFuture : '',
                    ].filter(Boolean).join(' ')}
                  >
                    <Text className={styles.dayText}>{cell.day}</Text>
                  </View>
                ))}
              </View>
              {!loading && (
                <Text className={styles.todayStatus}>
                  {status?.checked_in
                    ? `今日已自动打卡 · 完成 ${status.questions_completed} 次练习作答`
                    : '完成一次练习作答即可自动打卡'}
                </Text>
              )}
            </View>
          )}
        </View>

        <View className={styles.actionBar}>
          <View
            className={`${styles.actionButton} ${status?.checked_in || loading || error ? styles.actionButtonDone : ''}`}
            onClick={status?.checked_in || loading || error ? undefined : goPractice}
          >
            <Text className={styles.actionButtonText}>
              {loading ? '加载中…' : status?.checked_in ? `今日已打卡 · 连续 ${status.consecutive_days} 天` : '去练习打卡'}
            </Text>
          </View>
        </View>

        {rulesVisible && (
          <View className={styles.modalOverlay} onClick={() => setRulesVisible(false)}>
            <View className={styles.modalBox} onClick={event => event.stopPropagation()}>
              <Text className={styles.modalTitle}>打卡规则</Text>
              <View className={styles.ruleList}>
                {RULES.map((rule, index) => (
                  <View key={rule} className={styles.ruleItem}>
                    <Text className={styles.ruleIndex}>{index + 1}</Text>
                    <Text className={styles.ruleText}>{rule}</Text>
                  </View>
                ))}
              </View>
              <View className={styles.modalFooter} onClick={() => setRulesVisible(false)}>
                <Text className={styles.modalPrimaryText}>知道了</Text>
              </View>
            </View>
          </View>
        )}

      </View>
    </AuthGuard>
  )
}
