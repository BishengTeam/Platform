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
  /** 'card' = 首页 2x2 宫格带背景色, 'tab' = 个人中心 1x4 横向平铺 */
  variant?: 'card' | 'tab'
}

export function KingKongZone({ items, onItemClick, className, columns = 2, variant = 'card' }: KingKongZoneProps) {
  const handleItemClick = useCallback((e: { currentTarget: { dataset: Record<string, string> } }) => {
    if (!onItemClick) return
    const index = Number(e.currentTarget.dataset.index)
    if (items[index]) onItemClick(items[index])
  }, [items, onItemClick])

  const itemClass = variant === 'tab' ? styles.itemTab : styles.itemCard

  return (
    <View className={`${styles.section} ${className || ''}`}>
      <View className={styles.grid} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {items.map((item, i) => (
          <View
            key={item.name}
            className={itemClass}
            style={{ background: item.bg }}
            data-index={i}
            onClick={handleItemClick}
          >
            <View className={styles.icon}>
              <Icon name={item.icon} size={40} color={item.iconColor} />
            </View>
            <Text className={styles.label}>{item.name}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
