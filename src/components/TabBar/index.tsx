import { useCallback, useState } from 'react'
import { Tabbar, TabbarItem } from '@nutui/nutui-react-taro'
import { Icon } from '@/components/Icon'
import { TAB_BAR_CONFIG } from '@/constants/routes'
import styles from './index.module.scss'

const tabs = TAB_BAR_CONFIG

interface CustomTabBarProps {
  activeTabKey?: string
  onSwitch?: (url: string) => void
}

export function CustomTabBar({ activeTabKey, onSwitch }: CustomTabBarProps) {
  const active = activeTabKey
    ? tabs.findIndex(t => t.key === activeTabKey)
    : 0

  const handleSwitch = useCallback((value: number) => {
    const tab = tabs[value]
    if (tab) {
      onSwitch?.(`/${tab.key}`)
    }
  }, [onSwitch])

  return (
    <Tabbar
      className={styles.bar}
      value={active >= 0 ? active : 0}
      activeColor='#1677FF'
      inactiveColor='#999999'
      onSwitch={handleSwitch}
      fixed={false}
    >
      {tabs.map(tab => (
        <TabbarItem
          key={tab.key}
          icon={<Icon name={tab.icon} size={28} color='currentColor' />}
          title={<span className={styles.label}>{tab.label}</span>}
        />
      ))}
    </Tabbar>
  )
}
