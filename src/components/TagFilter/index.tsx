import { ScrollView, View } from '@tarojs/components'
import styles from './index.module.scss'

export interface TagFilterItem {
  label: string
  activeColor: string
  activeBg: string
  activeText: string
}

interface TagFilterProps {
  tags: TagFilterItem[]
  activeTag: string
  onChange: (tag: string) => void
}

export function TagFilter({ tags, activeTag, onChange }: TagFilterProps) {
  return (
    <ScrollView scrollX className={styles.scroll} enableFlex>
      <View className={styles.row}>
        {tags.map((item) => {
          const isActive = activeTag === item.label
          return (
            <View
              key={item.label}
              className={`${styles.tag} ${isActive ? styles.active : ''}`}
              style={isActive
                ? `background: ${item.activeBg}; color: ${item.activeText}`
                : `color: ${item.activeColor}`
              }
              onClick={() => onChange(item.label)}
            >
              {item.label}
            </View>
          )
        })}
      </View>
    </ScrollView>
  )
}
