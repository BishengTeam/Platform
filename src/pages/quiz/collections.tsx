import { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { STRINGS } from '@/constants/strings'
import { getFavoriteQuestions, removeFavorite } from '@/services/dataService'
import type { QuizQuestion } from '@/types'
import styles from './collections.module.scss'

export default function QuizCollectionsPage() {
  const [items, setItems] = useState<QuizQuestion[]>([])

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    getFavoriteQuestions().then(setItems).catch(() => {})
  }, [])

  const handleRemove = (id: number) => {
    setItems(prev => prev.filter(item => item.id !== id))
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    removeFavorite(id)
  }

  const handlePractice = (item: QuizQuestion) => {
    Taro.navigateTo({ url: `/pages/quiz/practice?categoryId=${item.categoryId}` })
  }

  if (items.length === 0) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.QUIZ_COLLECTIONS_TITLE} shouldShowBack />
          <EmptyState title={STRINGS.QUIZ_COLLECTIONS_EMPTY} />
        </View>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.QUIZ_COLLECTIONS_TITLE} shouldShowBack />
        <View className={styles.body}>
          {items.map(item => (
            <View key={item.id} className={styles.card}>
              <View className={styles.cardHeader}>
                <Text className={styles.typeTag}>
                  {item.type === 'single' ? STRINGS.QUIZ_TYPE_SINGLE : STRINGS.QUIZ_TYPE_MULTIPLE}
                </Text>
              </View>
              <Text className={styles.stem}>{item.stem}</Text>
              <View className={styles.actions}>
                <Button size='sm' variant='secondary' onClick={() => handleRemove(item.id)}>
                  {STRINGS.QUIZ_UNCOLLECT}
                </Button>
                <Button size='sm' onClick={() => handlePractice(item)}>
                  {STRINGS.QUIZ_START_PRACTICE}
                </Button>
              </View>
            </View>
          ))}
        </View>
      </View>
    </AuthGuard>
  )
}
