import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import { getWrongBook } from '@/services/dataService'
import type { WrongQuestion } from '@/types'
import styles from './wrong-book.module.scss'

export default function WrongBookPage() {
  const [items, setItems] = useState<WrongQuestion[]>(getWrongBook())

  const handleRemove = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const handleRedo = (item: WrongQuestion) => {
    Taro.navigateTo({ url: `/pages/quiz/practice?categoryId=${item.categoryId}` })
  }

  if (items.length === 0) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.QUIZ_WRONG_BOOK_TITLE} shouldShowBack />
          <EmptyState title={STRINGS.QUIZ_WRONG_BOOK_EMPTY} />
        </View>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.QUIZ_WRONG_BOOK_TITLE} shouldShowBack />
        <View className={styles.body}>
          {items.map(item => (
            <View key={item.id} className={styles.card}>
              <View className={styles.cardHeader}>
                <Text className={styles.wrongCount}>
                  {STRINGS.QUIZ_WRONG_COUNT}: {item.wrongCount}
                </Text>
                <Text className={styles.wrongDate}>{item.wrongDate}</Text>
              </View>
              <Text className={styles.stem}>{item.stem}</Text>
              <View className={styles.options}>
                {item.options.map((opt, idx) => {
                  const correct = Array.isArray(item.correctAnswer)
                    ? item.correctAnswer.includes(idx)
                    : item.correctAnswer === idx
                  return (
                    <Text key={opt.label} className={`${styles.optionText} ${correct ? styles.optionCorrect : ''}`}>
                      {opt.label}. {opt.text}
                    </Text>
                  )
                })}
              </View>
              <Text className={styles.explanation}>{item.explanation}</Text>
              <View className={styles.actions}>
                <Button size='sm' variant='secondary' onClick={() => handleRemove(item.id)}>
                  {STRINGS.QUIZ_WRONG_BOOK_REMOVE}
                </Button>
                <Button size='sm' onClick={() => handleRedo(item)}>
                  {STRINGS.QUIZ_WRONG_BOOK_REDO}
                </Button>
              </View>
            </View>
          ))}
        </View>
      </View>
    </AuthGuard>
  )
}
