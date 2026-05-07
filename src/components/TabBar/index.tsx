import { useCallback, useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { Tabbar, TabbarItem } from '@nutui/nutui-react-taro'
import { Icon } from '@/components/Icon'
import { TAB_BAR_CONFIG } from '@/constants/routes'
import styles from './index.module.scss'

const tabs = TAB_BAR_CONFIG

export default function CustomTabBar() {
  const [active, setActive] = useState(0)

  useDidShow(() => {
    const pages = Taro.getCurrentPages()
    const currPage = pages[pages.length - 1]
    const path = currPage?.route || ''
    const idx = tabs.findIndex(t => path === t.key)
    if (idx >= 0) setActive(idx)
  })

  const handleSwitch = useCallback((value: number) => {
    const tab = tabs[value]
    if (tab) {
      Taro.switchTab({ url: `/${tab.key}` })
    }
  }, [])

  return (
    <Tabbar
      className={styles.bar}
      value={active}
      activeColor='#1677FF'
      inactiveColor='#999999'
      onSwitch={handleSwitch}
      fixed={false}
    >
      {tabs.map(tab => (
        <TabbarItem
          key={tab.key}
          icon={<Icon name={tab.icon} size={32} color='currentColor' />}
          title={<span className={styles.label}>{tab.label}</span>}
        />
      ))}
    </Tabbar>
  )
}
