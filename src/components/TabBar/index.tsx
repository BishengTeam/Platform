import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { TAB_BAR_CONFIG } from '@/constants/routes'
import styles from './index.module.scss'

const tabs = TAB_BAR_CONFIG

export default function CustomTabBar() {
  const [active, setActive] = useState('')

  useDidShow(() => {
    const pages = Taro.getCurrentPages()
    const currPage = pages[pages.length - 1]
    const path = currPage?.route || ''
    const match = tabs.find(t => path === t.key)
    if (match) setActive(match.key)
  })

  const handleTap = (tab: typeof tabs[0]) => {
    Taro.switchTab({ url: `/${tab.key}` })
  }

  return (
    <View className={styles.bar}>
      {tabs.map(tab => {
        const isActive = tab.key === active
        return (
          <View key={tab.key} className={styles.item} onClick={() => handleTap(tab)}>
            <View className={styles.iconWrap}>
              <Icon name={tab.icon} size={44} color={isActive ? '#1677FF' : '#999999'} />
            </View>
            <Text className={`${styles.label} ${isActive ? styles.labelActive : ''}`}>
              {tab.label}
            </Text>
          </View>
        )
      })}
    </View>
  )
}
