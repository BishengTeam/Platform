import { View, Text } from '@tarojs/components'
import { Icon } from '@/components/Icon'
import { ICON_SVG_MAP } from '@/constants/icons'
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
          {ICON_SVG_MAP[item.icon] ? (
            <View className={styles.iconWrap} style={{ background: `${item.color || '#1677FF'}1A` }}>
              <Icon name={item.icon} size={iconSize} color={item.color || '#1677FF'} />
            </View>
          ) : (
            <Text className={styles.quizBottomIcon} style={{ fontSize: `${iconSize}px` }}>{item.icon}</Text>
          )}
          <Text className={styles.quizBottomLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  )
}
