import { useCallback, useEffect, useMemo, useState } from 'react'
import { H3C_REGISTRATION_TYPE_LABELS } from '@/utils/h3cRegistration'
import { Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { RefreshableScrollView } from '@/components/RefreshableScrollView'
import { ROUTES } from '@/constants/routes'
import { h3cService } from '@/services/h3cService'
import { sangforService, type SangforRegistration } from '@/services/sangforService'
import { SANGFOR_STATUS } from '@/utils/sangforForm'
import { getMyCompetitionRegistrations } from '@/services/zoneService'
import { formatDateTime } from '@/utils/format'
import {
  nispService,
  type NispRegistration,
} from '@/services/nispService'
import {
  rensheService,
  type RensheApplicationListItem,
} from '@/services/rensheService'
import type { H3cRegistration } from '@/types/h3c'
import type { CompetitionMyRegistration } from '@/types'
import { preloadRegistrationPreview } from '@/utils/registrationPreview'
import styles from './registrations.module.scss'

type H3cRegistrationCard = H3cRegistration & { type: 'H3C' }
type NispRegistrationCard = NispRegistration & {
  type: 'NISP'
  levelLabel: string
}
type UnifiedRegistration = H3cRegistrationCard | NispRegistrationCard
type RegistrationCategory = 'h3c' | 'nisp' | 'renshe' | 'sangfor' | 'competition'
type StatusGroup = 'active' | 'passed' | 'closed'

interface RegistrationCard {
  key: string
  category: RegistrationCategory
  categoryLabel: string
  title: string
  status: string
  statusGroup: StatusGroup
  statusLabel: string
  statusClass: string
  detailUrl: string
  extraRows: Array<{ label: string; value: string }>
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending_payment: { label: '待支付', cls: styles.statusPending },
  pending_review: { label: '审核中', cls: styles.statusReview },
  rejected_awaiting_resubmission: { label: '待补交材料', cls: styles.statusRejected },
  pending_refund_confirmation: { label: '待确认退款', cls: styles.statusPending },
  refund_processing: { label: '退款中', cls: styles.statusPending },
  approved: { label: '审核通过', cls: styles.statusApproved },
  final_approved: { label: '终审通过', cls: styles.statusApproved },
  refunded_closed: { label: '已退款关闭', cls: styles.statusNeutral },
  cancelled: { label: '已取消', cls: styles.statusNeutral },
  draft: { label: '草稿', cls: styles.statusNeutral },
  pending_initial_review: { label: '待初审', cls: styles.statusReview },
  initial_rejected: { label: '待补正 · 初审退回', cls: styles.statusRejected },
  pending_external_review: { label: '待外审', cls: styles.statusReview },
  external_rejected: { label: '待补正 · 外审退回', cls: styles.statusRejected },
  external_approved: { label: '外审通过', cls: styles.statusApproved },
  closed: { label: '已关闭', cls: styles.statusNeutral },
  returned: { label: '待补正', cls: styles.statusRejected },
}

const STATUS_GROUPS: Record<string, StatusGroup> = {
  pending_payment: 'active',
  pending_review: 'active',
  rejected_awaiting_resubmission: 'active',
  returned: 'active',
  draft: 'active',
  pending_initial_review: 'active',
  initial_rejected: 'active',
  pending_external_review: 'active',
  external_rejected: 'active',
  pending_refund_confirmation: 'active',
  refund_processing: 'active',
  approved: 'passed',
  final_approved: 'passed',
  external_approved: 'passed',
  refunded_closed: 'closed',
  cancelled: 'closed',
  closed: 'closed',
}

const CATEGORY_LABELS: Record<RegistrationCategory, string> = {
  h3c: 'H3C',
  nisp: 'NISP',
  renshe: '人社',
  sangfor: '深信服',
  competition: '竞赛',
}

const CATEGORY_ORDER: RegistrationCategory[] = [
  'h3c',
  'nisp',
  'renshe',
  'sangfor',
  'competition',
]
const STATUS_GROUP_ORDER: StatusGroup[] = ['active', 'passed', 'closed']
const STATUS_GROUP_LABELS: Record<StatusGroup, string> = {
  active: '进行中',
  passed: '已通过',
  closed: '已关闭',
}

const TYPE_LABELS = H3C_REGISTRATION_TYPE_LABELS

function statusDisplay(status: string) {
  return STATUS_CONFIG[status] || { label: status, cls: '' }
}

function registrationDetailUrl(category: RegistrationCategory, id: number) {
  if (category === 'sangfor') return `/${ROUTES.SANGFOR_DETAIL}?id=${id}`
  return `/${ROUTES.MINE_REGISTRATION_DETAIL}?type=${category}&id=${id}`
}

function certificationCard(item: UnifiedRegistration): RegistrationCard {
  const isH3c = item.type === 'H3C'
  const status = statusDisplay(item.status)
  return {
    key: `${isH3c ? 'h3c' : 'nisp'}-${item.id}`,
    category: isH3c ? 'h3c' : 'nisp',
    categoryLabel: isH3c ? CATEGORY_LABELS.h3c : CATEGORY_LABELS.nisp,
    title: item.registration_no,
    status: item.status,
    statusGroup: STATUS_GROUPS[item.status] || 'active',
    statusLabel: status.label,
    statusClass: status.cls,
    detailUrl: registrationDetailUrl(isH3c ? 'h3c' : 'nisp', item.id),
    extraRows: [
      {
        label: '类型',
        value: isH3c
          ? TYPE_LABELS[item.registration_type] || item.registration_type
          : `NISP ${item.levelLabel}`,
      },
      { label: '金额', value: `${(item.price_cents / 100).toFixed(2)} 元` },
    ],
  }
}

function rensheCard(item: RensheApplicationListItem): RegistrationCard {
  const status = statusDisplay(item.status)
  return {
    key: `renshe-${item.id}`,
    category: 'renshe',
    categoryLabel: CATEGORY_LABELS.renshe,
    title: item.plan.name,
    status: item.status,
    statusGroup: STATUS_GROUPS[item.status] || 'active',
    statusLabel: status.label,
    statusClass: status.cls,
    detailUrl: registrationDetailUrl('renshe', item.id),
    extraRows: [
      {
        label: '报考项目',
        value: `${item.plan.occupation_name || '待核实'} · ${item.plan.skill_level || '待核实'}`,
      },
      { label: '订单状态', value: item.current_order?.status || '-' },
      {
        label: '金额',
        value: item.current_order
          ? `${(item.current_order.price_cents / 100).toFixed(2)} 元`
          : '-',
      },
    ],
  }
}

function sangforCard(item: SangforRegistration): RegistrationCard {
  const status = statusDisplay(item.status)
  return {
    key: `sangfor-${item.id}`,
    category: 'sangfor',
    categoryLabel: CATEGORY_LABELS.sangfor,
    title: item.batch_snapshot.name,
    status: item.status,
    statusGroup: STATUS_GROUPS[item.status] || 'active',
    statusLabel: SANGFOR_STATUS[item.status] || status.label,
    statusClass: status.cls,
    detailUrl: registrationDetailUrl('sangfor', item.id),
    extraRows: [
      { label: '报考方向', value: item.batch_snapshot.exam_direction },
      { label: '金额', value: `${(item.price_cents / 100).toFixed(2)} 元` },
    ],
  }
}

function competitionCard(item: CompetitionMyRegistration, now: number): RegistrationCard {
  const closed = !item.editable || (item.end_time !== null && Date.parse(item.end_time) < now)
  return {
    key: `competition-${item.id}`,
    category: 'competition',
    categoryLabel: CATEGORY_LABELS.competition,
    title: item.competition_name,
    status: closed ? 'closed' : 'active',
    statusGroup: closed ? 'closed' : 'active',
    statusLabel: closed ? '已结束' : '进行中',
    statusClass: closed ? styles.statusNeutral : styles.statusReview,
    detailUrl: registrationDetailUrl('competition', item.id),
    extraRows: [
      { label: '赛道', value: item.track || '-' },
      { label: '姓名', value: item.real_name || '-' },
      { label: '报名时间', value: formatDateTime(item.created_at, '-') },
    ],
  }
}

export default function MyRegistrationsPage() {
  const [items, setItems] = useState<UnifiedRegistration[]>([])
  const [rensheItems, setRensheItems] = useState<RensheApplicationListItem[]>([])
  const [sangforItems, setSangforItems] = useState<SangforRegistration[]>([])
  const [compRegs, setCompRegs] = useState<CompetitionMyRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeCategory, setActiveCategory] = useState<'all' | RegistrationCategory>('all')
  const [activeStatus, setActiveStatus] = useState<'all' | StatusGroup>('all')
  const [openingKey, setOpeningKey] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    return Promise.all([
      h3cService.listRegistrations()
        .then(r => r.items.map((item): H3cRegistrationCard => ({ ...item, type: 'H3C' })))
        .catch(() => [] as H3cRegistrationCard[]),
      nispService.listRegistrations()
        .then(r => r.items.map((item): NispRegistrationCard => ({
          ...item,
          type: 'NISP',
          levelLabel: item.level === '1' ? '一级' : '二级',
        })))
        .catch(() => [] as NispRegistrationCard[]),
      getMyCompetitionRegistrations().catch(() => [] as CompetitionMyRegistration[]),
      rensheService.listApplications().then(page => page.items).catch(() => [] as RensheApplicationListItem[]),
      sangforService.registrations().then(page => page.items).catch(() => [] as SangforRegistration[]),
    ])
      .then(([h3cItems, nispItems, competitionItems, rensheApplicationItems, sangforRegistrations]) => {
        setItems([...h3cItems, ...nispItems])
        setCompRegs(competitionItems)
        setRensheItems(rensheApplicationItems)
        setSangforItems(sangforRegistrations)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useDidShow(() => {
    void load()
  })

  const allCards = useMemo(() => [
    ...items.map(certificationCard),
    ...rensheItems.map(rensheCard),
    ...sangforItems.map(sangforCard),
    ...compRegs.map(item => competitionCard(item, Date.now())),
  ], [compRegs, items, rensheItems, sangforItems])

  const categoryTabs = useMemo(() => {
    const present = new Set(allCards.map(card => card.category))
    return [
      { key: 'all' as const, label: '全部' },
      ...CATEGORY_ORDER.filter(category => present.has(category))
        .map(category => ({ key: category, label: CATEGORY_LABELS[category] })),
    ]
  }, [allCards])

  const categoryFiltered = useMemo(() => (
    activeCategory === 'all'
      ? allCards
      : allCards.filter(card => card.category === activeCategory)
  ), [activeCategory, allCards])

  const statusTabs = useMemo(() => {
    const present = new Set(categoryFiltered.map(card => card.statusGroup))
    return [
      { key: 'all' as const, label: '全部状态' },
      ...STATUS_GROUP_ORDER.filter(group => present.has(group))
        .map(group => ({ key: group, label: STATUS_GROUP_LABELS[group] })),
    ]
  }, [categoryFiltered])

  const finalFiltered = useMemo(() => (
    activeStatus === 'all'
      ? categoryFiltered
      : categoryFiltered.filter(card => card.statusGroup === activeStatus)
  ), [activeStatus, categoryFiltered])

  useEffect(() => {
    if (activeCategory !== 'all' && !categoryTabs.some(tab => tab.key === activeCategory)) {
      setActiveCategory('all')
      setActiveStatus('all')
    }
  }, [activeCategory, categoryTabs])

  useEffect(() => {
    if (activeStatus !== 'all' && !statusTabs.some(tab => tab.key === activeStatus)) {
      setActiveStatus('all')
    }
  }, [activeStatus, statusTabs])

  const handleCategoryChange = (key: 'all' | RegistrationCategory) => {
    setActiveCategory(key)
    setActiveStatus('all')
  }

  const openRegistrationCard = (card: RegistrationCard) => {
    if (openingKey) return
    setOpeningKey(card.key)
    preloadRegistrationPreview({
      key: card.key,
      title: card.title,
      categoryLabel: card.categoryLabel,
      statusLabel: card.statusLabel,
      statusGroup: card.statusGroup,
      extraRows: card.extraRows,
    })
    Taro.navigateTo({ url: card.detailUrl })
      .catch(() => Taro.showToast({ title: '打开详情失败', icon: 'none' }))
      .finally(() => setOpeningKey(''))
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='我的报名' shouldShowBack />
        <View className={styles.filterPanel}>
          <View className={styles.filterRow}>
            {categoryTabs.map(tab => (
              <View
                key={tab.key}
                className={`${styles.filterTag} ${activeCategory === tab.key ? styles.filterTagActive : ''}`}
                onClick={() => handleCategoryChange(tab.key)}
              >
                <Text>{tab.label}</Text>
              </View>
            ))}
          </View>
          <View className={`${styles.filterRow} ${styles.filterRowSecondary}`}>
            {statusTabs.map(tab => (
              <View
                key={tab.key}
                className={`${styles.filterTag} ${styles.filterTagSmall} ${activeStatus === tab.key ? styles.filterTagActive : ''}`}
                onClick={() => setActiveStatus(tab.key)}
              >
                <Text>{tab.label}</Text>
              </View>
            ))}
          </View>
        </View>
        <RefreshableScrollView className={styles.body} onRefresh={load}>
          {loading && <View className={styles.loading}>加载中...</View>}

          {error && (
            <View className={styles.empty}>
              <Text>加载失败</Text>
              <Text className={styles.emptyHint}>网络异常，请稍后重试</Text>
              <View className={styles.retryBtn} onClick={load}>
                <Text>重新加载</Text>
              </View>
            </View>
          )}

          {!loading && !error && allCards.length === 0 && (
            <View className={styles.empty}>
              <Text>暂无报名记录</Text>
              <Text className={styles.emptyHint}>去认证专区选择认证开始报名</Text>
            </View>
          )}

          {!loading && !error && allCards.length > 0 && finalFiltered.length === 0 && (
            <View className={styles.empty}>
              <Text>当前筛选无结果</Text>
              <Text className={styles.emptyHint}>请更换认证类型或状态</Text>
            </View>
          )}

          {!loading && !error && finalFiltered.map(card => (
            <View
              key={card.key}
              className={`${styles.card} ${openingKey === card.key ? styles.cardOpening : ''}`}
              onClick={() => openRegistrationCard(card)}
            >
              <View className={styles.cardHeader}>
                <Text className={styles.title}>{card.title}</Text>
                <Text className={styles.typeBadge}>{card.categoryLabel}</Text>
              </View>
              <View className={styles.row}>
                <Text className={styles.label}>状态</Text>
                <Text className={`${styles.status} ${card.statusClass}`}>
                  {card.statusLabel}
                </Text>
              </View>
              {card.extraRows.map(row => (
                <View key={row.label} className={styles.row}>
                  <Text className={styles.label}>{row.label}</Text>
                  <Text className={row.label === '金额' ? styles.amount : styles.value}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </RefreshableScrollView>
      </View>
    </AuthGuard>
  )
}
