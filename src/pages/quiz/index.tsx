import { useState, useEffect, useCallback } from 'react'
import { View } from '@tarojs/components'
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
import type { QuizCategory } from '@/types/quiz'
import { getQuizCategories, getCheckinStatus } from '@/services/dataService'
import styles from './index.module.scss'

export default function QuizIndexPage() {
  const [categories, setCategories] = useState<QuizCategory[]>([])
  const [streakDays, setStreakDays] = useState(0)
  const [loading, setLoading] = useState(true)

  // 首次加载：分类 + 签到状态
  useEffect(() => {
    Promise.all([
      getQuizCategories(),
      getCheckinStatus(),
    ]).then(([cats, status]) => {
      setCategories(cats)
      setStreakDays(status?.consecutiveDays ?? 0)
    }).catch(() => {
      // 加载失败时保持默认空状态
    }).finally(() => {
      setLoading(false)
    })
  }, [])

  // 页面每次显示时刷新签到状态（Taro navigateBack 不会重新 mount）
  useDidShow(() => {
    getCheckinStatus()
      .then(status => setStreakDays(status?.consecutiveDays ?? 0))
      .catch(() => {})
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

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.QUIZ_HEADER} shouldShowBack />
        <View className={styles.body}>
          <CheckinBar
            streakDays={streakDays}
            onCheckin={() => Taro.navigateTo({ url: `/pages/quiz/checkin` })}
          />

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
