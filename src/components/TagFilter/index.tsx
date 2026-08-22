import { useCallback, useEffect, useMemo, useState } from 'react'
import { ScrollView, View, Text } from '@tarojs/components'
import { Tag } from '@nutui/nutui-react-taro'
import Taro, { useReady } from '@tarojs/taro'
import type { TagFilterItem } from '@/types/registration'
import styles from './index.module.scss'

interface TagFilterProps {
  tags: TagFilterItem[] | string[]
  activeTag: string
  onChange: (tag: string) => void
  variant?: 'pill' | 'underline'
  className?: string
}

const UNDERLINE_INDICATOR_WIDTH = 24

function toTagItem(item: TagFilterItem | string): TagFilterItem {
  if (typeof item === 'string') {
    return {
      label: item,
      activeColor: '#1677FF',
      activeBg: '#1677FF',
      activeText: '#ffffff',
      inactiveBg: '#F0F5FF',
    }
  }
  return item
}

export function TagFilter({ tags, activeTag, onChange, variant = 'pill', className = '' }: TagFilterProps) {
  const items = useMemo(() => tags.map(toTagItem), [tags])
  const activeIndex = items.findIndex(item => item.label === activeTag)
  const [tabCenters, setTabCenters] = useState<number[]>([])
  const [indicatorReady, setIndicatorReady] = useState(false)

  const measureTabs = useCallback(() => {
    const query = Taro.createSelectorQuery()
    query.selectAll(`.${styles.underlineTab}`).boundingClientRect()
    query.select(`.${styles.underlineRow}`).boundingClientRect()
    query.exec(results => {
      const rects = (results?.[0] ?? []) as Array<{ left: number; width: number }>
      const row = results?.[1] as { left: number } | null | undefined
      if (!row || rects.length === 0) return
      setTabCenters(rects.map(rect => rect.left - row.left + rect.width / 2))
      setIndicatorReady(false)
      Taro.nextTick(() => { setIndicatorReady(true) })
    })
  }, [styles])

  const labelKey = items.map(item => item.label).join('\u0000')
  useReady(() => { measureTabs() })
  useEffect(() => { measureTabs() }, [labelKey, measureTabs])

  if (variant === 'underline') {
    return (
      <ScrollView scrollX className={styles.scroll} enableFlex>
        <View className={styles.underlineRow}>
          {items.map((item) => {
            const isActive = activeTag === item.label
            return (
              <View
                key={item.label}
                className={`${styles.underlineTab} ${isActive ? styles.underlineTabActive : ''}`}
                onClick={() => onChange(item.label)}
              >
                <Text className={styles.underlineTabText}>
                  {item.label}
                </Text>
              </View>
            )
          })}
          <View
            className={`${styles.underlineIndicator} ${
              indicatorReady ? styles.underlineIndicatorReady : ''
            }`}
            style={{
              opacity:
                indicatorReady &&
                activeIndex >= 0 &&
                tabCenters[activeIndex] !== undefined
                  ? 1
                  : 0,
              transform: `translateX(${
                (tabCenters[activeIndex] ?? 0) - UNDERLINE_INDICATOR_WIDTH / 2
              }px)`,
            }}
          />
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
              className={`${styles.tag} ${className}`}
              background={isActive ? tag.activeBg : tag.inactiveBg}
              color={isActive ? tag.activeText : tag.activeColor}
              style={isActive ? undefined : tag.inactiveStyle}
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
