import { useCallback, useEffect, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { CheckinBar } from '@/components/CheckinBar'
import { PageHeader } from '@/components/PageHeader'
import { QuizBottomNav } from '@/components/QuizBottomNav'
import { QuizCategoryList } from '@/components/QuizCategoryList'
import { QuizGrid } from '@/components/QuizGrid'
import { QUIZ_BOTTOM, QUIZ_GRID } from '@/constants/quiz'
import type { QuizBottomItem } from '@/constants/quiz'
import { ROUTES } from '@/constants/routes'
import { STRINGS } from '@/constants/strings'
import type { QuizCategoryNode, QuizStats } from '@/contracts/quiz'
import { useAuth } from '@/hooks/useAuth'
import { getQuizCheckinStatus, getQuizStats, listQuizCategories } from '@/services/dataService'
import styles from './index.module.scss'

interface StatCard { label: string; value: string; color: string }

const COLORS = ['#1677FF', '#52C41A', '#722ED1', '#FF4D4F', '#FA8C16', '#13C2C2']

export default function QuizIndexPage() {
  const { isChecked, isLoggedIn } = useAuth()
  const [categories, setCategories] = useState<QuizCategoryNode[]>([])
  const [stats, setStats] = useState<QuizStats | null>(null)
  const [streakDays, setStreakDays] = useState(0)
  const [loading, setLoading] = useState(true)
  const [categoryError, setCategoryError] = useState(false)

  const requireLogin = useCallback((action: () => void) => {
    if (isLoggedIn) action()
    else Taro.navigateTo({ url: `/${ROUTES.AUTH}` })
  }, [isLoggedIn])

  const loadPersonal = useCallback(() => {
    if (!isChecked || !isLoggedIn) return
    Promise.all([getQuizCheckinStatus(), getQuizStats()])
      .then(([checkin, nextStats]) => {
        setStreakDays(checkin.consecutive_days)
        setStats(nextStats)
      })
      .catch(() => undefined)
  }, [isChecked, isLoggedIn])

  useDidShow(() => {
    setLoading(true)
    setCategoryError(false)
    listQuizCategories()
      .then(setCategories)
      .catch(() => setCategoryError(true))
      .finally(() => setLoading(false))
    loadPersonal()
  })

  // Authentication restoration can finish after the first page-show event.
  // React to that transition so a restored user receives personal data on the
  // first visit without having to leave and reopen the page.
  useEffect(() => {
    if (!isChecked) return
    if (!isLoggedIn) {
      setStats(null)
      setStreakDays(0)
      return
    }
    loadPersonal()
  }, [isChecked, isLoggedIn, loadPersonal])

  const handleGrid = useCallback((item: { mode: string }) => requireLogin(() => {
    if (item.mode === 'mock') Taro.navigateTo({ url: `/${ROUTES.QUIZ_MOCK}` })
    else if (item.mode === 'history') Taro.navigateTo({ url: `/${ROUTES.QUIZ_HISTORY}` })
    else if (item.mode === 'stats') Taro.navigateTo({ url: `/${ROUTES.QUIZ_STATS}` })
    else Taro.showToast({ title: '请从下方分类选择练习范围', icon: 'none' })
  }), [requireLogin])

  const statCards: StatCard[] = stats ? [
    { label: '练习作答', value: String(stats.practice.total_attempts), color: COLORS[0] },
    { label: '首答正确率', value: `${stats.practice.accuracy}%`, color: COLORS[1] },
    { label: '已答题目', value: String(stats.practice.answered_questions), color: COLORS[2] },
    { label: '当前错题', value: String(stats.practice.active_wrong_count), color: COLORS[3] },
    { label: STRINGS.QUIZ_CHECKIN_STREAK, value: `${stats.practice.consecutive_days}天`, color: COLORS[4] },
    { label: STRINGS.QUIZ_STATS_TODAY, value: String(stats.practice.today_questions), color: COLORS[5] },
  ] : []

  return (
    <View className={styles.page}>
      <PageHeader title={STRINGS.QUIZ_HEADER} shouldShowBack />
      <View className={styles.body}>
        {isLoggedIn ? (
          <CheckinBar streakDays={streakDays} onCheckin={() => Taro.navigateTo({ url: `/${ROUTES.QUIZ_CHECKIN}` })} />
        ) : (
          <View className={styles.loginHint} onClick={() => Taro.navigateTo({ url: `/${ROUTES.AUTH}` })}>
            <Text>分类可直接查看；登录后可练习、考试并查看个人统计</Text>
          </View>
        )}

        {statCards.length > 0 && (
          <View className={styles.statsPanel}>
            <View className={styles.statsGrid}>
              {statCards.map(card => (
                <View key={card.label} className={styles.statCard}>
                  <Text className={styles.statValue} style={{ color: card.color }}>{card.value}</Text>
                  <Text className={styles.statLabel}>{card.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <QuizGrid items={QUIZ_GRID} onItemClick={handleGrid} />
        {loading && <Text className={styles.stateText}>正在加载分类…</Text>}
        {!loading && categoryError && <Text className={styles.stateText}>分类加载失败，请稍后重试</Text>}
        {!loading && !categoryError && categories.length === 0 && <Text className={styles.stateText}>暂无可用题库分类</Text>}
        {categories.length > 0 && (
          <QuizCategoryList
            categories={categories}
            onBrowse={categoryId => requireLogin(() => Taro.navigateTo({ url: `/${ROUTES.QUIZ_QUESTIONS}?categoryId=${categoryId}` }))}
            onPractice={categoryId => requireLogin(() => Taro.navigateTo({ url: `/${ROUTES.QUIZ_PRACTICE}?categoryId=${categoryId}` }))}
          />
        )}
        <QuizBottomNav items={QUIZ_BOTTOM} onItemClick={(item: QuizBottomItem) => requireLogin(() => Taro.navigateTo({ url: `/${item.route}` }))} />
      </View>
    </View>
  )
}
