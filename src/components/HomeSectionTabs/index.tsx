import { View, Text } from '@tarojs/components'
import styles from './index.module.scss'

export interface HomeSectionTab {
  key: string
  label: string
}

interface Props {
  tabs: HomeSectionTab[]
  activeKey: string
  onChange: (key: string) => void
}

/**
 * 首页板块导航：横排 tab + 短下划线指示器，点击切换板块内容。
 * 位于金刚区（各专区宫格）下方，随页面内容滚动（2026-10-15 甲方指定位置）。
 */
export function HomeSectionTabs({ tabs, activeKey, onChange }: Props) {
  return (
    <View className={styles.tabs}>
      {tabs.map((tab) => {
        const active = tab.key === activeKey
        return (
          <View
            key={tab.key}
            className={`${styles.tab} ${active ? styles.tabActive : ''}`}
            onClick={() => {
              if (!active) onChange(tab.key)
            }}
          >
            <Text className={styles.tabText}>{tab.label}</Text>
            <View className={styles.indicator} />
          </View>
        )
      })}
    </View>
  )
}
