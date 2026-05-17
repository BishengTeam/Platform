import { View, Text } from '@tarojs/components'
import { Icon } from '@/components/Icon'
import type { HomeCard as HomeCardItem } from '@/constants/mock/home'
import styles from './index.module.scss'

interface Props {
  items: HomeCardItem[]
  onCardClick?: (item: HomeCardItem) => void
}

export function HomeCard({ items, onCardClick }: Props) {
  const leftColumn = items.filter((_, i) => i % 2 === 0)
  const rightColumn = items.filter((_, i) => i % 2 === 1)

  const renderCard = (item: HomeCardItem) => {
    const coverCls = item.tall ? styles.coverTall : styles.coverShort
    return (
      <View
        key={item.id}
        className={styles.card}
        onClick={() => onCardClick?.(item)}
      >
        <View
          className={`${styles.cover} ${coverCls}`}
          style={{ background: item.gradient }}
        >
          <Icon name={item.icon} size={item.tall ? 40 : 32} color='rgba(255,255,255,0.85)' />
          <View className={styles.tag} style={{ background: item.tagColor }}>
            <Text className={styles.tagText}>{item.tag}</Text>
          </View>
        </View>
        <View className={styles.info}>
          <Text className={styles.title}>{item.title}</Text>
          <Text className={styles.desc}>{item.description}</Text>
        </View>
      </View>
    )
  }

  return (
    <View className={styles.waterfall}>
      <View className={styles.column}>
        {leftColumn.map(renderCard)}
      </View>
      <View className={styles.column}>
        {rightColumn.map(renderCard)}
      </View>
    </View>
  )
}
