import { ScrollView, View } from '@tarojs/components'
import { Tag } from '@nutui/nutui-react-taro'
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
            <Tag
              key={item.label}
              className={styles.tag}
              background={isActive ? item.activeBg : undefined}
              color={isActive ? item.activeText : item.activeColor}
              onClick={() => onChange(item.label)}
            >
              {item.label}
            </Tag>
          )
        })}
      </View>
    </ScrollView>
  )
}
