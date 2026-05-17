import { ScrollView, View, Text } from '@tarojs/components'
import { Tag } from '@nutui/nutui-react-taro'
import type { TagFilterItem } from '@/types/registration'
import styles from './index.module.scss'

interface TagFilterProps {
  tags: TagFilterItem[] | string[]
  activeTag: string
  onChange: (tag: string) => void
  variant?: 'pill' | 'underline'
}

function toTagItem(item: TagFilterItem | string): TagFilterItem {
  if (typeof item === 'string') {
    return {
      label: item,
      activeColor: '#1677FF',
      activeBg: '#F0F5FF',
      activeText: '#1677FF',
      inactiveBg: '#F5F5F5',
    }
  }
  return item
}

export function TagFilter({ tags, activeTag, onChange, variant = 'pill' }: TagFilterProps) {
  if (variant === 'underline') {
    return (
      <ScrollView scrollX className={styles.scroll} enableFlex>
        <View className={styles.underlineRow}>
          {tags.map((item) => {
            const tag = toTagItem(item)
            const isActive = activeTag === tag.label
            return (
              <View
                key={tag.label}
                className={`${styles.underlineTab} ${isActive ? styles.underlineTabActive : ''}`}
                onClick={() => onChange(tag.label)}
              >
                <Text
                  className={styles.underlineTabText}
                  style={{ color: isActive ? '#1677FF' : '#666666' }}
                >
                  {tag.label}
                </Text>
                {isActive && <View className={styles.underlineIndicator} />}
              </View>
            )
          })}
        </View>
      </ScrollView>
    )
  }

  return (
    <ScrollView scrollX className={styles.scroll} enableFlex>
      <View className={styles.row}>
        {tags.map((item) => {
          const tag = toTagItem(item)
          const isActive = activeTag === tag.label
          return (
            <Tag
              key={tag.label}
              className={styles.tag}
              background={isActive ? tag.activeBg : tag.inactiveBg}
              color={isActive ? tag.activeText : tag.activeColor}
              onClick={() => onChange(tag.label)}
            >
              {tag.label}
            </Tag>
          )
        })}
      </View>
    </ScrollView>
  )
}
