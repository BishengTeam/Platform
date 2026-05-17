import { View, Text } from '@tarojs/components'
import { Icon } from '@/components/Icon'
import styles from './index.module.scss'

export interface KingKongItem {
  name: string
  bg: string
  iconColor: string
  icon: string
  url: string
}

interface KingKongZoneProps {
  items: KingKongItem[]
  onItemClick?: (item: KingKongItem) => void
}

export function KingKongZone({ items, onItemClick }: KingKongZoneProps) {
  return (
    <View className={styles.section}>
      <View className={styles.grid}>
        {items.map((item) => (
          <View
            key={item.name}
            className={styles.item}
            style={{ background: item.bg }}
            onClick={() => onItemClick?.(item)}
          >
            <Text className={styles.label}>{item.name}</Text>
            <View className={styles.icon}>
              <Icon name={item.icon} size={40} color={item.iconColor} />
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}
