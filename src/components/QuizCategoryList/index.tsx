import { View, Text } from '@tarojs/components'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import styles from './index.module.scss'

export interface QuizCategoryItem {
  id: string
  name: string
  questionCount: number
}

interface QuizCategoryListProps {
  categories: QuizCategoryItem[]
  onCategoryClick: (categoryId: string) => void
}

export function QuizCategoryList({ categories, onCategoryClick }: QuizCategoryListProps) {
  return (
    <View className={styles.quizCategoryList}>
      {categories.map(cat => (
        <View key={cat.id} className={styles.quizCategoryCard}>
          <View className={styles.quizCategoryInfo}>
            <Text className={styles.quizCategoryName}>{cat.name}</Text>
            <Text className={styles.quizCategoryCount}>
              {cat.questionCount}{STRINGS.FORM_QUESTION_SUFFIX}
            </Text>
          </View>
          <Button size='sm' variant='secondary' onClick={() => onCategoryClick(cat.id)}>
            {STRINGS.QUIZ_START_PRACTICE}
          </Button>
        </View>
      ))}
    </View>
  )
}
