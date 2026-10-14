import { useCallback, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { RefreshableScrollView } from '@/components/RefreshableScrollView'
import { ROUTES } from '@/constants/routes'
import { h3cService } from '@/services/h3cService'
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
import styles from './registrations.module.scss'

type H3cRegistrationCard = H3cRegistration & { type: 'H3C' }
type NispRegistrationCard = NispRegistration & {
  type: 'NISP'
  levelLabel: string
}
type UnifiedRegistration = H3cRegistrationCard | NispRegistrationCard

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
}

const TYPE_LABELS: Record<string, string> = {
  full: '全款报名',
  coupon: '优惠卷报名',
  student: '学生报名',
}

export default function MyRegistrationsPage() {
  const [items, setItems] = useState<UnifiedRegistration[]>([])
  const [rensheItems, setRensheItems] = useState<RensheApplicationListItem[]>([])
  const [compRegs, setCompRegs] = useState<CompetitionMyRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

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
    ])
      .then(([h3cItems, nispItems, competitionItems, rensheApplicationItems]) => {
        setItems([...h3cItems, ...nispItems])
        setCompRegs(competitionItems)
        setRensheItems(rensheApplicationItems)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useDidShow(() => {
    void load()
  })

  const openRegistrationDetail = (
    type: 'h3c' | 'nisp' | 'competition' | 'renshe',
    id: number,
  ) => {
    Taro.navigateTo({
      url: `/${ROUTES.MINE_REGISTRATION_DETAIL}?type=${type}&id=${id}`,
    }).catch(() => {
      Taro.showToast({ title: '打开详情失败', icon: 'none' })
    })
  }

  const registrationTypeLabel = (registration: UnifiedRegistration) => (
    registration.type === 'H3C'
      ? TYPE_LABELS[registration.registration_type] || registration.registration_type
      : `NISP ${registration.levelLabel}`
  )

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='我的报名' shouldShowBack />
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

          {!loading && !error && items.length === 0 && compRegs.length === 0 && rensheItems.length === 0 && (
            <View className={styles.empty}>
              <Text>暂无报名记录</Text>
              <Text className={styles.emptyHint}>去认证专区选择认证开始报名</Text>
            </View>
          )}

          {!loading && !error && compRegs.length > 0 && (
            <Text className={styles.sectionTitle}>竞赛报名</Text>
          )}

          {!loading && !error && rensheItems.length > 0 && (
            <Text className={styles.sectionTitle}>人社报名</Text>
          )}
          {!loading && !error && rensheItems.map(item => {
            const cfg = STATUS_CONFIG[item.status]
            return (
              <View
                key={`renshe-${item.id}`}
                className={styles.card}
                onClick={() => openRegistrationDetail('renshe', item.id)}
              >
                <View className={styles.cardHeader}>
                  <Text className={styles.title}>{item.plan.name}</Text>
                  <Text className={styles.typeBadge}>人社</Text>
                </View>
                <View className={styles.row}>
                  <Text className={styles.label}>状态</Text>
                  <Text className={`${styles.status} ${cfg?.cls || ''}`}>
                    {cfg?.label || item.status}
                  </Text>
                </View>
                <View className={styles.row}>
                  <Text className={styles.label}>订单状态</Text>
                  <Text className={styles.value}>{item.current_order?.status || '-'}</Text>
                </View>
                <View className={styles.row}>
                  <Text className={styles.label}>金额</Text>
                  <Text className={styles.amount}>
                    {item.current_order
                      ? `${(item.current_order.price_cents / 100).toFixed(2)} 元`
                      : '-'}
                  </Text>
                </View>
              </View>
            )
          })}
          {!loading && !error && compRegs.map((reg) => (
            <View
              key={`comp-${reg.id}`}
              className={styles.card}
              onClick={() => openRegistrationDetail('competition', reg.id)}
            >
              <View className={styles.cardHeader}>
                <Text className={styles.title}>{reg.competition_name}</Text>
                <Text className={styles.typeBadge}>{reg.track || '竞赛'}</Text>
              </View>
              <View className={styles.row}>
                <Text className={styles.label}>姓名</Text>
                <Text className={styles.value}>{reg.real_name || '-'}</Text>
              </View>
              <View className={styles.row}>
                <Text className={styles.label}>学校</Text>
                <Text className={styles.value}>{reg.school}</Text>
              </View>
              <View className={styles.row}>
                <Text className={styles.label}>报名时间</Text>
                <Text className={styles.value}>{formatDateTime(reg.created_at, '-')}</Text>
              </View>
            </View>
          ))}

          {!loading && !error && items.map((item) => {
            const cfg = STATUS_CONFIG[item.status]
            return (
              <View
                key={`${item.type}-${item.id}`}
                className={styles.card}
                onClick={() => openRegistrationDetail(item.type.toLowerCase() as 'h3c' | 'nisp', item.id)}
              >
                <View className={styles.cardHeader}>
                  <Text className={styles.title}>{item.registration_no}</Text>
                  <Text className={styles.typeBadge}>
                    {item.type}{item.type === 'NISP' ? ` ${item.levelLabel}` : ''}
                  </Text>
                </View>
                <View className={styles.row}>
                  <Text className={styles.label}>状态</Text>
                  <Text className={`${styles.status} ${cfg?.cls || ''}`}>
                    {cfg?.label || item.status}
                  </Text>
                </View>
                <View className={styles.row}>
                  <Text className={styles.label}>类型</Text>
                  <Text className={styles.value}>{registrationTypeLabel(item)}</Text>
                </View>
                <View className={styles.row}>
                  <Text className={styles.label}>金额</Text>
                  <Text className={styles.amount}>{(item.price_cents / 100).toFixed(2)} 元</Text>
                </View>
              </View>
            )
          })}
        </RefreshableScrollView>
      </View>
    </AuthGuard>
  )
}
