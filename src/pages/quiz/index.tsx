import { useState, useEffect, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { QuizGrid } from '@/components/QuizGrid'
import { QuizBottomNav } from '@/components/QuizBottomNav'
import { CheckinBar } from '@/components/CheckinBar'
import { QuizCategoryList } from '@/components/QuizCategoryList'
import { STRINGS } from '@/constants/strings'
import { QUIZ_GRID, QUIZ_BOTTOM } from '@/constants/quiz'
import type { QuizBottomItem } from '@/constants/quiz'
import type { QuizCategory, QuizStats } from '@/types/quiz'
import { getQuizCategories, getCheckinStatus, getQuizStats } from '@/services/dataService'
import styles from './index.module.scss'

/** 统计卡片配置 */
interface StatCard {
  label: string
  value: string
  color: string
}

const STAT_CARD_COLORS = {
  total:   '#1677FF',
  accuracy: '#52C41A',
  completion: '#722ED1',
  wrong:   '#FF4D4F',
  streak:  '#FA8C16',
  today:   '#13C2C2',
}

export default function QuizIndexPage() {
  const [categories, setCategories] = useState<QuizCategory[]>([])
  const [streakDays, setStreakDays] = useState(0)
  const [stats, setStats] = useState<QuizStats | null>(null)
  const [loading, setLoading] = useState(true)

  // 首次加载：分类 + 签到状态 + 统计
  useEffect(() => {
    Promise.all([
      getQuizCategories(),
      getCheckinStatus(),
      getQuizStats(),
    ]).then(([cats, status, s]) => {
      setCategories(cats)
      setStreakDays(status?.consecutiveDays ?? 0)
      setStats(s)
    }).catch(() => {
      // 加载失败时保持默认空状态
    }).finally(() => {
      setLoading(false)
    })
  }, [])

  // 页面每次显示时刷新签到状态和统计（Taro navigateBack 不会重新 mount）
  useDidShow(() => {
    Promise.all([
      getCheckinStatus(),
      getQuizStats(),
    ]).then(([status, s]) => {
      setStreakDays(status?.consecutiveDays ?? 0)
      setStats(s)
    }).catch(() => {})
  })

  const handleQuizGrid = useCallback((item: { mode: string }) => {
    if (item.mode === 'mock') {
      Taro.navigateTo({ url: `/pages/quiz/mock` })
    } else {
      Taro.navigateTo({ url: `/pages/quiz/practice?mode=${item.mode}` })
    }
  }, [])

  const handleQuizCategory = useCallback((categoryId: string) => {
    Taro.navigateTo({ url: `/pages/quiz/practice?categoryId=${categoryId}` })
  }, [])

  const handleBottomNav = useCallback((item: QuizBottomItem) => {
    Taro.navigateTo({ url: `/pages/${item.route}` })
  }, [])

  // 构建统计卡片数据
  const statCards: StatCard[] = stats
    ? [
        { label: STRINGS.QUIZ_STATS_TOTAL,      value: String(stats.totalQuestions), color: STAT_CARD_COLORS.total },
        { label: STRINGS.QUIZ_STATS_ACCURACY,    value: `${stats.accuracy}%`,         color: STAT_CARD_COLORS.accuracy },
        { label: STRINGS.QUIZ_STATS_COMPLETION,  value: `${stats.completionRate}%`,   color: STAT_CARD_COLORS.completion },
        { label: STRINGS.QUIZ_STATS_WRONG,       value: String(stats.wrongCount),     color: STAT_CARD_COLORS.wrong },
        { label: STRINGS.QUIZ_CHECKIN_STREAK,    value: `${stats.streakDays}天`,      color: STAT_CARD_COLORS.streak },
        { label: STRINGS.QUIZ_STATS_TODAY,       value: String(stats.todayAnswers),   color: STAT_CARD_COLORS.today },
      ]
    : []

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.QUIZ_HEADER} shouldShowBack />
        <View className={styles.body}>
          <CheckinBar
            streakDays={streakDays}
            onCheckin={() => Taro.navigateTo({ url: `/pages/quiz/checkin` })}
          />

          {/* 数据面板 */}
          {!loading && statCards.length > 0 && (
            <View className={styles.statsPanel}>
              <View className={styles.statsGrid}>
                {statCards.map((card) => (
                  <View key={card.label} className={styles.statCard}>
                    <Text className={styles.statValue} style={{ color: card.color }}>
                      {card.value}
                    </Text>
                    <Text className={styles.statLabel}>{card.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {!loading && categories.length > 0 && (
            <>
              <QuizGrid items={QUIZ_GRID} onItemClick={handleQuizGrid} />
              <QuizCategoryList
                categories={categories}
                onCategoryClick={handleQuizCategory}
              />
            </>
          )}

          <QuizBottomNav items={QUIZ_BOTTOM} onItemClick={handleBottomNav} />
        </View>
      </View>
    </AuthGuard>
  )
}