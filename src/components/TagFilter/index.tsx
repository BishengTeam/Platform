import { useCallback } from 'react'
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
  const handleClick = useCallback((e: { currentTarget: { dataset: Record<string, string> } }) => {
    const label = e.currentTarget.dataset.label
    if (label) onChange(label)
  }, [onChange])

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
                data-label={tag.label}
                onClick={handleClick}
              >
                <Text className={styles.underlineTabText}>
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
              style={isActive ? undefined : tag.inactiveStyle}
              data-label={tag.label}
              onClick={handleClick}
            >
              {tag.label}
            </Tag>
          )
        })}
      </View>
    </ScrollView>
  )
}
