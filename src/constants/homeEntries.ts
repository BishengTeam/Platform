import type { KingKongItem } from '../components/KingKongZone/index'
import { STRINGS } from './strings.ts'

interface HomeEntryOptions {
  homeCertEntryVisible: boolean
  certRegistration: boolean
  hasActivities: boolean
  /** 英才计划有上架活动（内容驱动 + yingcaiZone 开关共同决定） */
  hasYingcai: boolean
  /** 公众号推文已同步：有推文即显示新闻资讯入口（2026.11.09 起不再限补位） */
  hasNews: boolean
}

/** 只生成实际可用入口，不用占位项补齐网格。 */
export function getHomeQuickEntries(options: HomeEntryOptions): KingKongItem[] {
  const items: KingKongItem[] = []
  if (options.homeCertEntryVisible && options.certRegistration) {
    items.push({
      name: STRINGS.INDEX_ZONE_REGISTRATION,
      bg: '#E6F7FF',
      iconColor: '#1a73e8',
      icon: 'check-circle-2',
      url: '/pages/registration/index',
    })
  }
  items.push({
    name: STRINGS.INDEX_ZONE_STUDY,
    bg: '#F6FFED',
    iconColor: '#2e7d32',
    icon: 'book-open',
    url: '/pages/training/index',
  }, {
    name: STRINGS.ZONE_NAMES[2],
    bg: '#FFF7E6',
    iconColor: '#c67c00',
    icon: 'trophy',
    url: '/pages/activity-zone/index',
    tab: 'competition',
  })
  if (options.hasActivities) {
    items.push({
      name: STRINGS.ZONE_NAMES[3],
      bg: '#F9F0FF',
      iconColor: '#722ED1',
      icon: 'gift',
      url: '/pages/activity-zone/index',
      tab: 'activity',
    })
  }
  if (options.hasYingcai) {
    items.push({
      name: STRINGS.INDEX_YINGCAI_TAB,
      bg: '#E6FFFB',
      iconColor: '#13C2C2',
      icon: 'star',
      url: '/pages/activity-zone/index',
      tab: 'yingcai',
    })
  }
  // 新闻资讯没有独立页面：点击切首页资讯板块（2026-11-10 起取消全屏模式）
  if (options.hasNews) {
    items.push({
      name: STRINGS.INDEX_NEWS_TAB,
      bg: '#FFF1F0',
      iconColor: '#cf1322',
      icon: 'bell',
      url: '',
      tab: 'news',
    })
  }
  return items
}
