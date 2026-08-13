import { View, Text } from '@tarojs/components'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import type { QuizCategoryNode } from '@/contracts/quiz'
import styles from './index.module.scss'

interface QuizCategoryListProps {
  categories: QuizCategoryNode[]
  onBrowse: (categoryId: number) => void
  onPractice: (categoryId: number) => void
}

export function QuizCategoryList({ categories, onBrowse, onPractice }: QuizCategoryListProps) {
  const renderNodes = (nodes: QuizCategoryNode[]) => nodes.map(cat => (
    <View key={cat.id}>
      <View className={styles.quizCategoryCard} style={{ marginLeft: `${(cat.depth - 1) * 16}px` }}>
        <View className={styles.quizCategoryInfo} onClick={() => onBrowse(cat.id)}>
          <Text className={styles.quizCategoryName}>{cat.name}</Text>
          <Text className={styles.quizCategoryCount}>
            {cat.question_count}{STRINGS.FORM_QUESTION_SUFFIX} · {cat.depth} 级分类
          </Text>
        </View>
        <View className={styles.actions}>
          <Button size='sm' variant='secondary' onClick={() => onBrowse(cat.id)}>
            浏览
          </Button>
          <Button size='sm' onClick={() => onPractice(cat.id)}>
            {STRINGS.QUIZ_START_PRACTICE}
          </Button>
        </View>
      </View>
      {cat.children.length > 0 && renderNodes(cat.children)}
    </View>
  ))

  return (
    <View className={styles.quizCategoryList}>
      {renderNodes(categories)}
    </View>
  )
}
