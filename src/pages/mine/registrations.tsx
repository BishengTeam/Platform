import { useCallback, useEffect, useState } from 'react'
import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { h3cService } from '@/services/h3cService'
import type { H3cRegistration } from '@/types/h3c'
import styles from './registrations.module.scss'

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending_payment: { label: '待支付', cls: styles.statusPending },
  pending_review: { label: '审核中', cls: styles.statusReview },
  rejected_awaiting_resubmission: { label: '待补交材料', cls: styles.statusRejected },
  pending_refund_confirmation: { label: '待确认退款', cls: styles.statusPending },
  refund_processing: { label: '退款中', cls: styles.statusPending },
  approved: { label: '审核通过', cls: styles.statusApproved },
  refunded_closed: { label: '已退款关闭', cls: styles.statusNeutral },
  cancelled: { label: '已取消', cls: styles.statusNeutral },
}

const TYPE_LABELS: Record<string, string> = {
  full: '全款报名',
  coupon: '优惠卷报名',
  student: '学生报名',
}

const FIELD_LABELS: Record<string, string> = {
  candidate_name: '姓名',
  gender: '性别',
  candidate_idcard: '身份证号',
  school: '学校',
  address: '地址',
  phone: '手机号',
  email: '邮箱',
  education: '学历',
  first_name_en: '英文名',
  last_name_en: '英文姓',
}


function formatExamDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}

export default function MyRegistrationsPage() {
  const [items, setItems] = useState<H3cRegistration[]>([])
  const [selected, setSelected] = useState<H3cRegistration | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    h3cService.listRegistrations()
      .then((result) => setItems(result.items))
      .catch(() => {
        setItems([])
        setError(true)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  usePullDownRefresh(() => {
    load()
    Taro.stopPullDownRefresh()
  })

  const openDetail = (item: H3cRegistration) => {
    setSelected(item)
    h3cService.getRegistration(item.id)
      .then(setSelected)
      .catch(() => Taro.showToast({ title: '加载详情失败', icon: 'none' }))
  }

  const upload = async (registration: H3cRegistration) => {
    const materialType = registration.latest_review?.rejected_material_types?.[0]
    if (!materialType) return
    const result = await Taro.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
    const filePath = result.tempFilePaths[0]
    if (!filePath) return
    Taro.showLoading({ title: '上传中', mask: true })
    try {
      const uploaded = await h3cService.uploadMaterial(
        filePath,
        registration.batch_id,
        materialType as 'coupon_proof' | 'student_proof',
      )
      await h3cService.resubmitMaterials(registration.id, {
        coupon_proof_key: materialType === 'coupon_proof' ? uploaded.storage_key : null,
        student_proof_key: materialType === 'student_proof' ? uploaded.storage_key : null,
      })
      Taro.showToast({ title: '补交成功', icon: 'success' })
      setSelected(null)
      load()
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '补交失败，请重试',
        icon: 'none',
        duration: 3000,
      })
    } finally {
      Taro.hideLoading()
    }
  }

  const cancelPayment = async (registration: H3cRegistration) => {
    Taro.showModal({
      title: '取消报名',
      content: `确定要取消报名 ${registration.registration_no} 吗？`,
      confirmText: '确定取消',
      cancelText: '再想想',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await h3cService.cancelPayment(registration.id)
          Taro.showToast({ title: '已取消', icon: 'success' })
          setSelected(null)
          load()
        } catch (err) {
          Taro.showToast({ title: err instanceof Error ? err.message : '取消失败', icon: 'none' })
        }
      },
    })
  }

  const snapshotEntries = (reg: H3cRegistration) =>
    Object.entries(reg.candidate_snapshot)
      .filter(([key]) => FIELD_LABELS[key])
      .map(([key, value]) => ({ label: FIELD_LABELS[key], value: String(value ?? '-') }))

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='我的报名' shouldShowBack />
        <ScrollView className={styles.body} scrollY>
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

          {!loading && !error && items.length === 0 && (
            <View className={styles.empty}>
              <Text>暂无报名记录</Text>
              <Text className={styles.emptyHint}>去认证专区选择认证开始报名</Text>
            </View>
          )}

          {!loading && !error && items.map((item) => {
            const cfg = STATUS_CONFIG[item.status]
            return (
              <View key={item.id} className={styles.card} onClick={() => openDetail(item)}>
                <View className={styles.cardHeader}>
                  <Text className={styles.title}>{item.registration_no}</Text>
                  <Text className={styles.typeBadge}>H3C</Text>
                </View>
                <View className={styles.row}>
                  <Text className={styles.label}>状态</Text>
                  <Text className={`${styles.status} ${cfg?.cls || ''}`}>
                    {cfg?.label || item.status}
                  </Text>
                </View>
                <View className={styles.row}>
                  <Text className={styles.label}>类型</Text>
                  <Text className={styles.value}>
                    {TYPE_LABELS[item.registration_type] || item.registration_type}
                  </Text>
                </View>
                <View className={styles.row}>
                  <Text className={styles.label}>金额</Text>
                  <Text className={styles.amount}>{(item.price_cents / 100).toFixed(2)} 元</Text>
                </View>
              </View>
            )
          })}
        </ScrollView>

        {selected && (
          <View className={styles.detailMask} onClick={() => setSelected(null)}>
            <View className={styles.detailSheet} onClick={(e) => e.stopPropagation()}>
              <View className={styles.detailBar} onClick={() => setSelected(null)} />
              <Text className={styles.detailTitle}>{selected.registration_no}</Text>
              <Text className={styles.detailSubtitle}>
                {STATUS_CONFIG[selected.status]?.label || selected.status}
              </Text>

              {selected.status === 'rejected_awaiting_resubmission' && selected.latest_review && (
                <View className={styles.rejectReason}>
                  <Text>
                    拒绝原因：{selected.latest_review.reason_detail || selected.latest_review.reason_code || '请联系客服'}
                  </Text>
                </View>
              )}

              {selected.status === 'approved' && (selected.exam_date || selected.exam_location) && (
                <>
                  <Text className={styles.sectionTitle}>考试安排</Text>
                  {selected.exam_date && (
                    <View className={styles.row}>
                      <Text className={styles.label}>考试时间</Text>
                      <Text className={styles.value}>{formatExamDate(selected.exam_date)}</Text>
                    </View>
                  )}
                  {selected.exam_location && (
                    <View className={styles.row}>
                      <Text className={styles.label}>考试地点</Text>
                      <Text className={styles.value}>{selected.exam_location}</Text>
                    </View>
                  )}
                </>
              )}

              <Text className={styles.sectionTitle}>报名信息</Text>
              {snapshotEntries(selected).map((entry) => (
                <View className={styles.row} key={entry.label}>
                  <Text className={styles.label}>{entry.label}</Text>
                  <Text className={styles.value}>{entry.value}</Text>
                </View>
              ))}

              <View className={styles.row}>
                <Text className={styles.label}>订单号</Text>
                <Text className={styles.value}>{selected.out_trade_no || '-'}</Text>
              </View>
              <View className={styles.row}>
                <Text className={styles.label}>报名时间</Text>
                <Text className={styles.value}>{selected.created_at.slice(0, 10)}</Text>
              </View>

              {selected.status === 'rejected_awaiting_resubmission' && (
                <View className={styles.actionRow}>
                  <View
                    className={`${styles.actionBtn} ${styles.actionPrimary}`}
                    onClick={() => upload(selected)}
                  >
                    <Text>补交材料</Text>
                  </View>
                </View>
              )}

              {selected.status === 'pending_payment' && (
                <View className={styles.actionRow}>
                  <View
                    className={`${styles.actionBtn} ${styles.actionSecondary}`}
                    onClick={() => cancelPayment(selected)}
                  >
                    <Text>取消报名</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </AuthGuard>
  )
}
