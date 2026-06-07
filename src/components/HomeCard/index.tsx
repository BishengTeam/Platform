import { View, Text, Image } from '@tarojs/components'
import { Icon } from '@/components/Icon'
import styles from './index.module.scss'

export interface HomeCardItem {
  id: number
  title: string
  description: string | null
  cover_url?: string | null
  gradient?: string
  icon?: string
  tag?: string
  tagColor?: string
  tall?: boolean
}

interface Props {
  items: HomeCardItem[]
  onCardClick?: (item: HomeCardItem) => void
}

export function HomeCard({ items, onCardClick }: Props) {
  const leftColumn = items.filter((_, i) => i % 2 === 0)
  const rightColumn = items.filter((_, i) => i % 2 === 1)

  const renderCard = (item: HomeCardItem, rowIndex: number, isLeftColumn: boolean) => {
    // tall 判定：显式值 > 位置自动错落（左列偶数行高、右列奇数行高）
    const isTall = item.tall !== undefined
      ? item.tall
      : isLeftColumn
        ? (rowIndex % 2 === 0)
        : (rowIndex % 2 === 1)
    const coverCls = isTall ? styles.coverTall : styles.coverShort
    const coverStyle: Record<string, string> = {}
    if (item.cover_url) {
      coverStyle.backgroundImage = `url(${item.cover_url})`
      coverStyle.backgroundSize = 'cover'
      coverStyle.backgroundPosition = 'center'
    } else if (item.gradient) {
      coverStyle.background = item.gradient
    }
    return (
      <View
        key={item.id}
        className={styles.card}
        onClick={() => onCardClick?.(item)}
      >
        <View
          className={`${styles.cover} ${coverCls}`}
          style={coverStyle}
        >
          {item.icon ? (
            <Icon name={item.icon} size={isTall ? 40 : 32} color='rgba(255,255,255,0.85)' />
          ) : null}
          {item.tag ? (
            <View className={styles.tag} style={{ background: item.tagColor }}>
              <Text className={styles.tagText}>{item.tag}</Text>
            </View>
          ) : null}
        </View>
        <View className={styles.info}>
          <Text className={styles.title}>{item.title}</Text>
          <Text className={styles.desc}>{item.description ?? ''}</Text>
        </View>
      </View>
    )
  }

  return (
    <View className={styles.waterfall}>
      <View className={styles.column}>
        {leftColumn.map((item, i) => renderCard(item, i, true))}
      </View>
      <View className={styles.column}>
        {rightColumn.map((item, i) => renderCard(item, i, false))}
      </View>
    </View>
  )
}
