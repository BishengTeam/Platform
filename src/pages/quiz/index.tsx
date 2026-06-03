import { useCallback } from 'react'
import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { QuizGrid } from '@/components/QuizGrid'
import { QuizBottomNav } from '@/components/QuizBottomNav'
import { CheckinBar } from '@/components/CheckinBar'
import { QuizCategoryList } from '@/components/QuizCategoryList'
import { STRINGS } from '@/constants/strings'
import { QUIZ_GRID, QUIZ_BOTTOM } from '@/constants/quiz'
import type { QuizBottomItem } from '@/constants/quiz'
import { getQuizCategories, getCheckinRecords } from '@/services/dataService'
import styles from './index.module.scss'

export default function QuizIndexPage() {
  const quizCategories = getQuizCategories()
  const checkinRecords = getCheckinRecords()
  const streakDays = checkinRecords.filter(r => r.completed).length

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

          <QuizGrid items={QUIZ_GRID} onItemClick={handleQuizGrid} />

          <QuizCategoryList
            categories={quizCategories}
            onCategoryClick={handleQuizCategory}
          />

          <QuizBottomNav items={QUIZ_BOTTOM} onItemClick={handleBottomNav} />
        </View>
      </View>
    </AuthGuard>
  )
}
