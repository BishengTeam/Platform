import { View, Text } from '@tarojs/components'
import type { QuizGridItem } from '@/constants/quiz'
import styles from './index.module.scss'

interface QuizGridProps {
  items: QuizGridItem[]
  onItemClick: (item: QuizGridItem) => void
}

export function QuizGrid({ items, onItemClick }: QuizGridProps) {
  return (
    <View className={styles.quizGrid}>
      {items.map(item => (
        <View key={item.mode} className={styles.quizGridItem} onClick={() => onItemClick(item)}>
          <Text className={styles.quizGridIcon}>{item.icon}</Text>
          <Text className={styles.quizGridLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  )
}
