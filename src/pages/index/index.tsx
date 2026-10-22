import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Avatar } from '@nutui/nutui-react-taro'

import { Icon } from '@/components/Icon'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { HomeSectionTabs } from '@/components/HomeSectionTabs'
import { HomeCard } from '@/components/HomeCard'
import { JobGrid } from '@/components/JobGrid'
import { ZoneBanner } from '@/components/ZoneBanner'
import { AdPopup } from '@/components/AdPopup'
import { KingKongZone } from '@/components/KingKongZone'
import type { KingKongItem } from '@/components/KingKongZone'
import { NewsTicker } from '@/components/NewsTicker'
import { NewsList } from '@/components/NewsList'
import type { HomeCardItem } from '@/components/HomeCard'
import { CustomTabBar } from '@/components/TabBar'
import { RefreshableScrollView } from '@/components/RefreshableScrollView'
import { STRINGS } from '@/constants/strings'
import { ROUTES, TAB_BAR_CONFIG } from '@/constants/routes'
import { FEATURES } from '@/constants/features'
import { getHomeAggregation } from '@/services/dataService'
import { resolveMediaUrl } from '@/utils/media'
import { navigateToCertRegistration } from '@/utils/certNavigation'
import type { HomeAggregationResponse } from '@/types'
import type { CertificationResponse } from '@/types'
import type { PopupBrief } from '@/types'
import type { GzhArticleBrief } from '@/types'
import styles from './index.module.scss'

// v1 口径：认证专区卡片保留在金刚区，但报名入口未开放——点击仅提示开发中。
// FEATURES.certRegistration 恢复 true 后原卡回到可跳转报名的完整形态。
const CERT_REG_KING_KONG_ITEM: KingKongItem = {
  name: STRINGS.INDEX_ZONE_REGISTRATION,
  bg: '#E6F7FF',
  iconColor: '#1a73e8',
  icon: 'check-circle-2',
  url: '/pages/registration/index',
}

const CERT_REG_PLACEHOLDER_ITEM: KingKongItem = {
  name: STRINGS.INDEX_ZONE_REGISTRATION,
  bg: '#E6F7FF',
  iconColor: '#1a73e8',
  icon: 'check-circle-2',
  url: '',
  comingSoon: true,
}

const BASE_KING_KONG_ITEMS: KingKongItem[] = [
  FEATURES.certRegistration ? CERT_REG_KING_KONG_ITEM : CERT_REG_PLACEHOLDER_ITEM,
  {
    name: STRINGS.INDEX_ZONE_STUDY,
    bg: '#F6FFED',
    iconColor: '#2e7d32',
    icon: 'book-open',
    url: '/pages/training/index',
  },
  {
    name: STRINGS.INDEX_ZONE_COMPETITION,
    bg: '#FFF7E6',
    iconColor: '#c67c00',
    icon: 'trophy',
    url: '/pages/activity-zone/index',
    tab: 'competition',
  },
]

const CERT_CARD_META: Record<string, { gradient: string; icon: string; tagColor: string }> = {
  'H3C': {
    gradient: 'linear-gradient(135deg, #1677FF 0%, #0B43A4 100%)',
    icon: 'award',
    tagColor: '#1677FF',
  },
  '深信服': {
    gradient: 'linear-gradient(135deg, #52C41A 0%, #237804 100%)',
    icon: 'shield',
    tagColor: '#52C41A',
  },
  'NISP': {
    gradient: 'linear-gradient(135deg, #FA8C16 0%, #AD4E00 100%)',
    icon: 'terminal',
    tagColor: '#FA8C16',
  },
  '人社': {
    gradient: 'linear-gradient(135deg, #EB2F96 0%, #9E1068 100%)',
    icon: 'file-text',
    tagColor: '#EB2F96',
  },
}

const DEFAULT_CERT_CARD_META = {
  gradient: 'linear-gradient(135deg, #1677FF 0%, #0B43A4 100%)',
  icon: 'award',
  tagColor: '#1677FF',
}

/** 「今日不再弹出」的本地存储 key，按天失效 */
function popupDismissKey(id: number): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `popup_dismissed_${id}_${d.getFullYear()}${mm}${dd}`
}

function toCertHomeCard(cert: CertificationResponse): HomeCardItem {
  const meta = CERT_CARD_META[cert.vendor] ?? DEFAULT_CERT_CARD_META
  const cover = cert.home_cover_url
  return {
    id: cert.id,
    title: cert.chinese_name || cert.name,
    description: null,
    // 与竞赛卡片同构：大图/渐变 + 厂商角标 + 标题，认证代码等明细进报名页
    // 上传了首页横幅（1404×640 通栏）则用图，未上传回退厂商渐变 + 图标
    cover_url: cover ? resolveMediaUrl(cover) : null,
    gradient: cover ? undefined : meta.gradient,
    icon: cover ? undefined : meta.icon,
    tag: cert.vendor,
    tagColor: meta.tagColor,
  }
}

export default function IndexPage() {
  const [homeData, setHomeData] = useState<HomeAggregationResponse | null>(null)
  const [activePopup, setActivePopup] = useState<PopupBrief | null>(null)
  // 每次冷启动只在首次拿到聚合数据时尝试弹窗，下拉刷新不重复触发
  const popupShownRef = useRef(false)
  const [activeSection, setActiveSection] = useState<string>('cert')

  const loadHome = useCallback(() => {
    return getHomeAggregation().then((data) => {
      setHomeData(data)
    }).catch((err) => {
      // 加载失败静默处理，页面展示空状态
    })
  }, [])

  useEffect(() => { void loadHome() }, [loadHome])

  useEffect(() => {
    const popup = homeData?.popup
    if (!popup || popupShownRef.current) return
    popupShownRef.current = true
    if (Taro.getStorageSync(popupDismissKey(popup.id))) return
    setActivePopup(popup)
  }, [homeData])

  const dismissPopupToday = useCallback(() => {
    if (activePopup) {
      Taro.setStorageSync(popupDismissKey(activePopup.id), true)
    }
    setActivePopup(null)
  }, [activePopup])

  const handleGoConsult = () => {
    Taro.navigateTo({ url: `/${ROUTES.AI_CONSULT}` })
  }

  const handleKingKongClick = (item: KingKongItem) => {
    if (item.comingSoon) {
      Taro.showToast({ title: STRINGS.INDEX_ACTIVITY_COMING_SOON, icon: 'none' })
      return
    }
    if (!item.url) return
    const path = item.url.replace(/^\//, '')
    if (TAB_BAR_CONFIG.some(t => t.key === path)) {
      if (item.tab) {
        Taro.setStorageSync('activityZoneTab', item.tab)
      }
      Taro.switchTab({ url: `/${path}` })
    } else {
      Taro.navigateTo({ url: item.url })
    }
  }

  const handleGoStudyZone = () => {
    Taro.switchTab({ url: '/pages/training/index' })
  }

  const handleGoActivityZone = () => {
    const path = `/${ROUTES.ACTIVITY}`
    Taro.switchTab({ url: path })
  }

  const handleGoCompetitionZone = () => {
    Taro.setStorageSync('activityZoneTab', 'competition')
    Taro.switchTab({ url: `/${ROUTES.ACTIVITY}` })
  }

  const handleGoEmploymentZone = () => {
    Taro.setStorageSync('activityZoneTab', 'employment')
    Taro.switchTab({ url: `/${ROUTES.ACTIVITY}` })
  }

  // 首页认证卡点击直达对应认证的报名入口（与报名分类页同一跳转规则）
  const handleCertCardClick = (item: HomeCardItem) => {
    const cert = (homeData?.zones['cert']?.certifications ?? []).find(c => c.id === item.id)
    if (cert) navigateToCertRegistration(cert)
  }

  // 活动/就业板块由后台内容驱动：管理端上架才出现，下架自动隐藏。
  const activities = homeData?.zones['activity']?.activities ?? []
  const employmentJobs = homeData?.zones['employment']?.jobs ?? []
  // 在线课程同为主页内容驱动板块：后台配置了课程才显示
  const studyCourses = homeData?.zones['study']?.courses ?? []
  const competitionList = homeData?.zones['competition']?.competitions ?? []
  // 资讯：后端同步到公众号推文才显示；无数据（含接口失败）ticker 整条隐藏、新闻 tab 不出现
  const gzhArticles = homeData?.gzh_articles ?? []
  const tickerArticle = gzhArticles[0]

  // 公众号文章统一跳 webview 容器页（ticker 与新闻资讯列表共用）
  const handleOpenArticle = useCallback((article: GzhArticleBrief) => {
    Taro.navigateTo({ url: `/${ROUTES.WEBVIEW}?url=${encodeURIComponent(article.url)}` })
  }, [])
  const certificationCards = useMemo(() => {
    return (homeData?.zones['cert']?.certifications ?? []).map(toCertHomeCard)
  }, [homeData])

  // 板块导航（2026-10-15 甲方要求：瀑布流改为顶部导航栏切换）。
  // 全部内容驱动：无内容的板块不出现 tab，顺序与原瀑布流一致。
  const sectionTabs = useMemo(() => {
    const tabs: { key: string; label: string }[] = []
    if (certificationCards.length > 0) tabs.push({ key: 'cert', label: STRINGS.ZONE_NAMES[0] })
    if (studyCourses.length > 0) tabs.push({ key: 'study', label: STRINGS.INDEX_ONLINE_COURSES })
    if (competitionList.length > 0) tabs.push({ key: 'competition', label: STRINGS.ZONE_NAMES[2] })
    if (activities.length > 0) tabs.push({ key: 'activity', label: STRINGS.INDEX_TRAINING_ACTIVITIES })
    if (employmentJobs.length > 0) tabs.push({ key: 'employment', label: STRINGS.ZONE_NAMES[4] })
    // 新闻资讯固定排最右：同步到公众号推文才出现
    if (gzhArticles.length > 0) tabs.push({ key: 'news', label: STRINGS.INDEX_NEWS_TAB })
    return tabs
  }, [certificationCards.length, studyCourses.length, competitionList.length, activities.length, employmentJobs.length, gzhArticles.length])

  // 后台下架导致当前 tab 消失时回落到第一个 tab
  useEffect(() => {
    if (sectionTabs.length > 0 && !sectionTabs.some(tab => tab.key === activeSection)) {
      setActiveSection(sectionTabs[0].key)
    }
  }, [sectionTabs, activeSection])

  const kingKongItems = useMemo(() => {
    const items = [...BASE_KING_KONG_ITEMS]
    // 第 4 格跟随后台上架：无上架活动时保留「敬请期待」占位补 2x2（点击提示开发中）。
    if (activities.length > 0) {
      items.push({
        name: STRINGS.ZONE_NAMES[3],
        bg: '#F9F0FF',
        iconColor: '#722ED1',
        icon: 'gift',
        url: '/pages/activity-zone/index',
        tab: 'activity',
      })
    } else {
      items.push({
        name: STRINGS.INDEX_ZONE_COMING_SOON,
        // 与前三格的浅蓝/浅绿/浅橙形成同饱和度的四色宫格。
        bg: '#F9F0FF',
        iconColor: '#722ED1',
        icon: 'sparkles',
        url: '',
        comingSoon: true,
      })
    }
    return items
  }, [activities.length])

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.INDEX_PAGE_TITLE} />

        <RefreshableScrollView className={styles.main} onRefresh={loadHome}>
          <View className={styles.bannerWrap}>
            <ZoneBanner items={(homeData?.banners ?? []).map(b => ({
              id: b.id,
              title: '',
              image_url: resolveMediaUrl(b.image_url),
              jump_link: b.jump_link,
            }))} />
          </View>

          {FEATURES.aiConsult && (
            <View className={styles.aiCard} onClick={handleGoConsult}>
              <View className={styles.aiCardLeft}>
                <Avatar size='44' icon={<Icon name='sparkles' size={20} color='#1677FF' />} background='#E6F7FF' />
                <View className={styles.aiCardInfo}>
                  <Text className={styles.aiCardTitle}>{STRINGS.INDEX_AI_NAME}</Text>
                  <Text className={styles.aiCardDesc}>{STRINGS.INDEX_AI_DESC}</Text>
                </View>
              </View>
              <View className={styles.aiCardRight}>
                <Text className={styles.aiCardAction}>{STRINGS.INDEX_AI_CONSULT_BTN}</Text>
                <Icon name='chevron-right' size={16} color='#1677FF' />
              </View>
            </View>
          )}

          {tickerArticle && (
            <NewsTicker article={tickerArticle} onClick={handleOpenArticle} />
          )}

          <KingKongZone items={kingKongItems} onItemClick={handleKingKongClick} />

          {/* 板块导航位于金刚区（各专区宫格）下方，列表内容随 tab 切换 */}
          {sectionTabs.length > 0 && (
            <HomeSectionTabs
              tabs={sectionTabs}
              activeKey={activeSection}
              onChange={setActiveSection}
            />
          )}

          {sectionTabs.length > 0 && (
            <View className={styles.section}>
              {activeSection === 'cert' && (
                <HomeCard items={certificationCards} onCardClick={handleCertCardClick} />
              )}
              {activeSection === 'study' && (
                <HomeCard items={studyCourses} onCardClick={handleGoStudyZone} />
              )}
              {activeSection === 'competition' && (
                <HomeCard
                  items={competitionList.map((comp) => {
                    // 大图通栏用横版封面（1404×640 恰好满宽不裁切）
                    const cover = comp.cover_url
                    return {
                      id: comp.id,
                      title: comp.name,
                      description: null,
                      cover_url: resolveMediaUrl(cover),
                      // 封面未配置时给竞赛主题橙色渐变 + 奖杯图标占位
                      gradient: cover ? undefined : 'linear-gradient(135deg, #FFA940 0%, #FA8C16 100%)',
                      icon: cover ? undefined : 'trophy',
                      tag: comp.tracks.length > 0 ? `${comp.tracks.length} 条赛道` : undefined,
                      tagColor: '#FA8C16',
                    }
                  })}
                  onCardClick={handleGoCompetitionZone}
                />
              )}
              {activeSection === 'activity' && (
                <HomeCard items={activities} onCardClick={handleGoActivityZone} />
              )}
              {activeSection === 'employment' && (
                <JobGrid
                  items={employmentJobs.map((job) => ({
                    id: job.id,
                    title: job.title,
                    location: job.location,
                    salary: job.salary_range,
                  }))}
                  onCardClick={handleGoEmploymentZone}
                />
              )}
              {activeSection === 'news' && (
                <NewsList articles={gzhArticles} onArticleClick={handleOpenArticle} />
              )}
            </View>
          )}
        </RefreshableScrollView>

        <CustomTabBar activeTabKey='pages/index/index' onSwitch={(url) => Taro.switchTab({ url })} />

        <AdPopup
          visible={activePopup !== null}
          imageUrl={activePopup ? resolveMediaUrl(activePopup.image_url) : ''}
          jumpLink={activePopup?.jump_link ?? null}
          onClose={() => setActivePopup(null)}
          onDismissToday={dismissPopupToday}
        />
      </View>
    </AuthGuard>
  )
}
