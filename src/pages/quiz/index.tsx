import { useState, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import { getQuizCategories, getCheckinRecords } from '@/services/dataService'
import styles from './index.module.scss'

const QUIZ_GRID = [
  { label: STRINGS.QUIZ_SECTION_PRACTICE, icon: '📝', mode: 'practice' },
  { label: STRINGS.QUIZ_MOCK_EXAM, icon: '📋', mode: 'mock' },
  { label: STRINGS.QUIZ_CHALLENGE, icon: '⚡', mode: 'challenge' },
  { label: STRINGS.QUIZ_ASSESSMENT, icon: '🎯', mode: 'assessment' },
]

const QUIZ_BOTTOM = [
  { label: STRINGS.QUIZ_WRONG_BOOK_TITLE, icon: '📕', route: ROUTES.QUIZ_WRONG_BOOK },
  { label: STRINGS.QUIZ_COLLECTIONS_TITLE, icon: '⭐', route: ROUTES.QUIZ_COLLECTIONS },
  { label: STRINGS.QUIZ_CHECKIN_TITLE, icon: '📅', route: ROUTES.QUIZ_CHECKIN },
]

export default function QuizIndexPage() {
  const quizCategories = getQuizCategories()
  const checkinRecords = getCheckinRecords()
  const streakDays = checkinRecords.filter(r => r.completed).length

  const handleQuizGrid = useCallback((mode: string) => {
    if (mode === 'mock') {
      Taro.navigateTo({ url: `/pages/quiz/mock` })
    } else {
      Taro.navigateTo({ url: `/pages/quiz/practice?mode=${mode}` })
    }
  }, [])

  const handleQuizCategory = useCallback((categoryId: string) => {
    Taro.navigateTo({ url: `/pages/quiz/practice?categoryId=${categoryId}` })
  }, [])

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.QUIZ_HEADER} shouldShowBack />
        <View className={styles.body}>
          <View className={styles.checkinBar}>
            <View className={styles.checkinInfo}>
              <Text className={styles.checkinStreak}>
                {STRINGS.QUIZ_CHECKIN_STREAK} {streakDays} {STRINGS.QUIZ_CHECKIN_DAYS}
              </Text>
            </View>
            <Button size='sm' onClick={() => Taro.navigateTo({ url: `/pages/quiz/checkin` })}>
              {STRINGS.QUIZ_CHECKIN_BTN}
            </Button>
          </View>

          <View className={styles.quizGrid}>
            {QUIZ_GRID.map(item => (
              <View key={item.mode} className={styles.quizGridItem} onClick={() => handleQuizGrid(item.mode)}>
                <Text className={styles.quizGridIcon}>{item.icon}</Text>
                <Text className={styles.quizGridLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          <View className={styles.quizCategoryList}>
            {quizCategories.map(cat => (
              <View key={cat.id} className={styles.quizCategoryCard}>
                <View className={styles.quizCategoryInfo}>
                  <Text className={styles.quizCategoryName}>{cat.name}</Text>
                  <Text className={styles.quizCategoryCount}>{cat.questionCount}{STRINGS.FORM_QUESTION_SUFFIX}</Text>
                </View>
                <Button size='sm' variant='secondary' onClick={() => handleQuizCategory(cat.id)}>
                  {STRINGS.QUIZ_START_PRACTICE}
                </Button>
              </View>
            ))}
          </View>

          <View className={styles.quizBottom}>
            {QUIZ_BOTTOM.map(item => (
              <View key={item.route} className={styles.quizBottomItem} onClick={() => Taro.navigateTo({ url: `/pages/${item.route}` })}>
                <Text className={styles.quizBottomIcon}>{item.icon}</Text>
                <Text className={styles.quizBottomLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </AuthGuard>
  )
}
