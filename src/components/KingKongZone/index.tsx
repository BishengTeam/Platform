import { useCallback } from 'react'
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
  className?: string
  columns?: number
}

export function KingKongZone({ items, onItemClick, className, columns = 2 }: KingKongZoneProps) {
  const handleItemClick = useCallback((e: { currentTarget: { dataset: Record<string, string> } }) => {
    if (!onItemClick) return
    const index = Number(e.currentTarget.dataset.index)
    if (items[index]) onItemClick(items[index])
  }, [items, onItemClick])

  return (
    <View className={`${styles.section} ${className || ''}`}>
      <View className={styles.grid} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {items.map((item, i) => (
          <View
            key={item.name}
            className={styles.item}
            style={{ background: item.bg }}
            data-index={i}
            onClick={handleItemClick}
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
