import { View, Text } from '@tarojs/components'
import type { QuizBottomItem } from '@/constants/quiz'
import styles from './index.module.scss'

interface QuizBottomNavProps {
  items: QuizBottomItem[]
  onItemClick: (item: QuizBottomItem) => void
  iconSize?: number
}

export function QuizBottomNav({ items, onItemClick, iconSize = 24 }: QuizBottomNavProps) {
  return (
    <View className={styles.quizBottom}>
      {items.map(item => (
        <View key={item.route} className={styles.quizBottomItem} onClick={() => onItemClick(item)}>
          <Text className={styles.quizBottomIcon} style={{ fontSize: `${iconSize}px` }}>{item.icon}</Text>
          <Text className={styles.quizBottomLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  )
}
