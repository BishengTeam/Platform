import { useState, useCallback, useMemo, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Icon } from '@/components/Icon'
import { KingKongZone } from '@/components/KingKongZone'
import type { KingKongItem } from '@/components/KingKongZone'
import { CustomTabBar } from '@/components/TabBar'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import { profileGridItems, profileListItems } from '@/constants/mock/profile'
import { getUserProfile } from '@/services/dataService'
import styles from './index.module.scss'

export default function ProfilePage() {
  const [userName, setUserName] = useState(STRINGS.PROFILE_MOCK_NAME)
  const [userStatus, setUserStatus] = useState(STRINGS.PROFILE_MOCK_STATUS)
  const [avatar, setAvatar] = useState('')

  useEffect(() => {
    getUserProfile().then(profile => {
      setUserName(profile.profile.nickname || STRINGS.PROFILE_MOCK_NAME)
      setUserStatus(profile.realname?.user_type || STRINGS.PROFILE_MOCK_STATUS)
      // avatar 字段已从后端 UserProfile 移除，使用默认头像
    }).catch(() => {})
  }, [])

  const handleNavigate = (route?: string) => {
    if (!route) {
      Taro.showToast({ title: STRINGS.PROFILE_FEATURE_IN_DEVELOPMENT, icon: 'none' })
      return
    }
    Taro.navigateTo({ url: `/${route}` })
  }

  const handleGridItemClick = useCallback((item: KingKongItem) => {
    handleNavigate(item.url || undefined)
  }, [])

  const gridItems: KingKongItem[] = useMemo(() => profileGridItems.map((item) => ({
    name: item.label,
    bg: 'transparent',
    iconColor: '#1677FF',
    icon: item.icon,
    url: item.route || '',
  })), [])

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.TAB_PROFILE} />

        <View className={styles.main}>
          <View
            className={styles.headerBanner}
            onClick={() => handleNavigate(ROUTES.MINE_PROFILE)}
          >
            <View className={styles.avatar}>
              {avatar ? (
                <Icon name='user' size={56} color='#1677FF' />
              ) : (
                <Icon name='user' size={56} color='#1677FF' />
              )}
            </View>
            <View className={styles.headerInfo}>
              <Text className={styles.name}>{userName}</Text>
              <Text className={styles.status}>{userStatus}</Text>
            </View>
            <Icon name='chevron-right' size={22} color='rgba(255,255,255,0.7)' className={styles.bannerArrow} />
          </View>

          <View className={`${styles.card} ${styles.cardOverlap}`}>
            <KingKongZone items={gridItems} onItemClick={handleGridItemClick} columns={4} variant='tab' className={styles.profileGrid} />
          </View>

          <View className={`${styles.card} ${styles.cardList}`}>
            {profileListItems.map((item, index) => (
              <View key={item.label}>
                {index > 0 && <View className={styles.divider} />}
                <View className={styles.listItem} onClick={() => handleNavigate(item.route)}>
                  <View className={styles.listLeft}>
                    <Icon name={item.icon} size={28} color='#666666' />
                    <Text className={styles.listLabel}>{item.label}</Text>
                  </View>
                  <Icon name='chevron-right' size={22} color='#CCCCCC' />
                </View>
              </View>
            ))}
          </View>

          <View className={`${styles.card} ${styles.cardSettings}`}>
            <View className={styles.listItem} onClick={() => handleNavigate('pages/mine/profile')}>
              <View className={styles.listLeft}>
                <Icon name='settings' size={28} color='#666666' />
                <Text className={styles.listLabel}>{STRINGS.PROFILE_SETTINGS}</Text>
              </View>
              <Icon name='chevron-right' size={22} color='#CCCCCC' />
            </View>
          </View>
        </View>

        <CustomTabBar activeTabKey='pages/profile/index' onSwitch={(url) => Taro.switchTab({ url })} />
      </View>
    </AuthGuard>
  )
}