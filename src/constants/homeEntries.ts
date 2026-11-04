import type { KingKongItem } from '../components/KingKongZone/index'
import { STRINGS } from './strings.ts'

interface HomeEntryOptions {
  homeCertEntryVisible: boolean
  certRegistration: boolean
  hasActivities: boolean
  /** 公众号推文已同步：专区恰好三个时用新闻资讯补位第四格 */
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
    name: STRINGS.INDEX_ZONE_COMPETITION,
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
  if (options.hasNews && items.length === 3) {
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
