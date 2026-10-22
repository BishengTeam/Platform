import { useState, useEffect } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Icon } from '@/components/Icon'
import { CustomTabBar } from '@/components/TabBar'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import { profileGridItems, profileListGroups } from '@/constants/mock/profile'
import type { ProfileMenuItem } from '@/types'
import { resolveMediaUrl } from '@/utils/media'
import { getUserProfile, getSharePoster } from '@/services/dataService'
import { getVerificationMaterialSignedUrl } from '@/services/identityMaterialService'
import styles from './index.module.scss'

export default function ProfilePage() {
  const [userName, setUserName] = useState<string>(STRINGS.PROFILE_MOCK_NAME)
  const [userStatus, setUserStatus] = useState<string>(STRINGS.PROFILE_MOCK_STATUS)
  // 二寸照存的是私有 OSS 键，需换取短时签名链接渲染；与个人资料页保持一致
  const [avatarUrl, setAvatarUrl] = useState('')
  // 积分海报：后台上传才显示，点击全屏预览（与分享好友页同链路）
  const [posterUrl, setPosterUrl] = useState('')

  const loadProfile = () => {
    getUserProfile().then(profile => {
      setUserName(profile.profile.nickname || STRINGS.PROFILE_MOCK_NAME)
      setUserStatus(profile.realname?.user_type || STRINGS.PROFILE_MOCK_STATUS)
      if (profile.realname?.avatar_oss) {
        getVerificationMaterialSignedUrl('portrait')
          .then((result) => setAvatarUrl(result.url))
          .catch(() => setAvatarUrl(''))
      } else {
        setAvatarUrl('')
      }
    }).catch(() => {})
  }

  useEffect(() => { loadProfile() }, [])

  useEffect(() => {
    getSharePoster()
      .then(res => setPosterUrl(res.image_url || ''))
      .catch(() => setPosterUrl(''))
  }, [])

  // 全屏预览，微信原生长按菜单即可保存到相册/转发
  const handlePreviewPoster = () => {
    if (!posterUrl) return
    Taro.showToast({ title: '长按海报可保存到相册', icon: 'none' })
    Taro.previewImage({ urls: [resolveMediaUrl(posterUrl)] })
  }

  // Tab 页常驻：签名链接 5 分钟过期、编辑资料后也需刷新，每次显示时重取
  useDidShow(() => { loadProfile() })

  const handleNavigate = (route?: string) => {
    if (!route) {
      Taro.showToast({ title: STRINGS.PROFILE_FEATURE_IN_DEVELOPMENT, icon: 'none' })
      return
    }
    Taro.navigateTo({ url: `/${route}` })
  }

  const handleGridItemClick = (item: ProfileMenuItem) => {
    if (item.comingSoon) {
      Taro.showToast({ title: STRINGS.INDEX_ACTIVITY_COMING_SOON, icon: 'none' })
      return
    }
    handleNavigate(item.route)
  }

  // v1 裁剪：快捷金刚区只看真实入口，全是置灰占位时整卡不渲染
  const gridItems = profileGridItems.filter(item => !item.comingSoon)
  const listGroups = profileListGroups.filter(group => group.length > 0)

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.TAB_PROFILE} />

        <View className={styles.main}>
          {/* ---- Header 个人信息区：渐变蓝底 + 白边头像 + 身份胶囊 ---- */}
          <View
            className={styles.headerBanner}
            onClick={() => handleNavigate(ROUTES.MINE_PROFILE)}
          >
            <View className={styles.avatar}>
              {avatarUrl
                ? <Image className={styles.avatarImage} src={avatarUrl} mode='aspectFill' />
                : <Icon name='user' size={56} color='#FFFFFF' />}
            </View>
            <View className={styles.headerInfo}>
              <Text className={styles.name}>{userName}</Text>
              <View className={styles.identityBadge}>
                <Text className={styles.identityText}>{userStatus}</Text>
              </View>
            </View>
            <Icon name='chevron-right' size={22} color='rgba(255,255,255,0.7)' className={styles.bannerArrow} />
          </View>

          {/* ---- 快捷金刚区：浮动白卡，4 列网格；无真实入口时整卡隐藏 ---- */}
          {gridItems.length > 0 && (
            <View className={`${styles.card} ${styles.gridCard}`}>
              <View className={styles.grid}>
                {gridItems.map((item, index) => (
                  <View
                    key={`${item.label}-${index}`}
                    className={`${styles.gridItem} ${item.comingSoon ? styles.gridItemComingSoon : ''}`}
                    onClick={() => handleGridItemClick(item)}
                  >
                    {item.comingSoon && (
                      <View className={styles.comingSoonBadge}>
                        <Text className={styles.comingSoonBadgeText}>{STRINGS.PROFILE_GRID_COMING_SOON_BADGE}</Text>
                      </View>
                    )}
                    <View className={styles.iconBase} style={{ background: item.iconBg }}>
                      <Icon name={item.icon} size={40} color={item.iconColor || '#1677FF'} />
                    </View>
                    <Text className={styles.gridLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ---- 积分海报：后台上传才显示，双版本（含 v1 裁剪版）均展示 ---- */}
          {posterUrl && (
            <View className={`${styles.card} ${styles.posterCard}`} onClick={handlePreviewPoster}>
              <View className={styles.posterHeader}>
                <Text className={styles.posterTitle}>{STRINGS.PROFILE_POSTER_TITLE}</Text>
                <Text className={styles.posterHint}>{STRINGS.PROFILE_POSTER_HINT}</Text>
              </View>
              <Image className={styles.posterImage} src={resolveMediaUrl(posterUrl)} mode='widthFix' />
            </View>
          )}

          {/* ---- 功能列表：分组白卡 ---- */}
          {listGroups.map((group, groupIndex) => (
            <View key={groupIndex} className={`${styles.card} ${styles.listCard}`}>
              {group.map((item, index) => (
                <View key={item.label}>
                  {index > 0 && <View className={styles.divider} />}
                  <View className={styles.listItem} onClick={() => handleNavigate(item.route)}>
                    <View className={styles.listLeft}>
                      <View className={styles.iconChip} style={{ background: item.iconBg }}>
                        <Icon name={item.icon} size={28} color={item.iconColor || '#666666'} />
                      </View>
                      <Text className={styles.listLabel}>{item.label}</Text>
                    </View>
                    <Icon name='chevron-right' size={22} color='#C9CDD4' />
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>

        <CustomTabBar activeTabKey='pages/profile/index' onSwitch={(url) => Taro.switchTab({ url })} />
      </View>
    </AuthGuard>
  )
}
