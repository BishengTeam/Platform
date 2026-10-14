import { View, Text, Image } from '@tarojs/components'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import styles from './index.module.scss'

export interface HomeCardItem {
  id: number
  title: string
  description: string | null
  cover_url?: string | null
  /** 无封面图时的占位渐变底色，配合 icon 使用 */
  gradient?: string
  /** 无封面图时的占位图标（有封面图时不渲染） */
  icon?: string
  /** 角标：有封面图时叠在图右上角，无封面图时作为标题行徽签 */
  tag?: string
  tagColor?: string
  actionText?: string
}

interface Props {
  items: HomeCardItem[]
  onCardClick?: (item: HomeCardItem) => void
}

export function HomeCard({ items, onCardClick }: Props) {
  return (
    <View className={styles.list}>
      {items.map((item) => {
        const hasCover = Boolean(item.cover_url) || Boolean(item.gradient)
        const coverStyle: Record<string, string> = {}
        if (!item.cover_url && item.gradient) {
          coverStyle.background = item.gradient
        }
        return (
          <View
            key={item.id}
            className={styles.card}
            onClick={() => onCardClick?.(item)}
          >
            {hasCover ? (
              <View className={styles.cover} style={coverStyle}>
                {item.cover_url ? (
                  <Image
                    className={styles.coverImage}
                    src={item.cover_url}
                    mode='aspectFill'
                  />
                ) : item.icon ? (
                  <Icon name={item.icon} size={48} color='rgba(255,255,255,0.85)' />
                ) : null}
                {item.tag ? (
                  <View className={styles.tag} style={{ background: item.tagColor }}>
                    <Text className={styles.tagText}>{item.tag}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
            <View className={styles.info}>
              <View className={styles.titleRow}>
                <Text className={styles.title}>{item.title}</Text>
                {!hasCover && item.tag ? (
                  <View className={styles.chip} style={{ background: item.tagColor }}>
                    <Text className={styles.tagText}>{item.tag}</Text>
                  </View>
                ) : null}
              </View>
              {item.description ? (
                <Text className={styles.desc}>{item.description}</Text>
              ) : null}
              {item.actionText ? (
                <View className={styles.footer}>
                  <Button
                    variant='secondary'
                    size='sm'
                    className={styles.actionButton}
                  >
                    {item.actionText}
                  </Button>
                </View>
              ) : null}
            </View>
          </View>
        )
      })}
    </View>
  )
}
