import { useCallback, useEffect, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { RefreshableScrollView } from '@/components/RefreshableScrollView'
import {
  CompetitionRegForm,
  validateCompetitionRegForm,
  type CompetitionRegFormValues,
} from '@/components/CompetitionRegForm'
import { h3cService } from '@/services/h3cService'
import {
  getMyCompetitionRegistrations,
  updateCompetitionRegistration,
} from '@/services/zoneService'
import { formatDateTime } from '@/utils/format'
import {
  nispService,
  type NispMaterialType,
  type NispRegistration,
} from '@/services/nispService'
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
  name: '姓名',
  pinyin: '拼音',
  major: '专业',
  id_card: '身份证号',
  province: '报考省份',
  training_type: '培训类型',
  birth_date: '出生日期',
  institution: '培训机构',
  age: '年龄',
  zip_code: '邮编',
}

const NISP_MATERIAL_LABELS: Record<NispMaterialType, string> = {
  id_card_both_sides: '身份证双面',
  portrait_photo: '证件照',
  xuexin_report: '学籍报告',
  application_form: '申请表',
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

function snapshotText(
  snapshot: Record<string, unknown> | undefined,
  key: string,
): string | null {
  const value = snapshot?.[key]
  return value === undefined || value === null || value === '' ? null : String(value)
}

function isUserCancelled(error: unknown): boolean {
  return Boolean((error as { errMsg?: string } | null)?.errMsg?.includes('cancel'))
}

async function chooseNispFile(materialType: NispMaterialType): Promise<string> {
  if (materialType === 'portrait_photo') {
    const result = await Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
    })
    return result.tempFilePaths[0] || ''
  }

  const result = await Taro.chooseMessageFile({
    count: 1,
    type: 'file',
    extension: ['pdf'],
  })
  return result.tempFiles[0]?.path || ''
}

export default function MyRegistrationsPage() {
  const [items, setItems] = useState<UnifiedRegistration[]>([])
  const [compRegs, setCompRegs] = useState<CompetitionMyRegistration[]>([])
  const [selected, setSelected] = useState<UnifiedRegistration | null>(null)
  const [editingReg, setEditingReg] = useState<CompetitionMyRegistration | null>(null)
  const [editValues, setEditValues] = useState<CompetitionRegFormValues>({ school: '', real_name: '', phone: '', custom: {} })
  const [savingEdit, setSavingEdit] = useState(false)
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
    ])
      .then(([h3cItems, nispItems, competitionItems]) => {
        setItems([...h3cItems, ...nispItems])
        setCompRegs(competitionItems)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const openDetail = (item: UnifiedRegistration) => {
    setSelected(item)
    if (item.type === 'H3C') {
      h3cService.getRegistration(item.id)
        .then(detail => setSelected({ ...detail, type: 'H3C' }))
        .catch(() => Taro.showToast({ title: '加载详情失败', icon: 'none' }))
      return
    }

    nispService.getRegistration(item.id)
      .then(detail => setSelected({
        ...detail,
        type: 'NISP',
        levelLabel: detail.level === '1' ? '一级' : '二级',
      }))
      .catch(() => Taro.showToast({ title: '加载详情失败', icon: 'none' }))
  }

  const openCompReg = (reg: CompetitionMyRegistration) => {
    setEditingReg(reg)
    setEditValues({
      school: reg.school || '',
      real_name: reg.real_name || '',
      phone: reg.phone || '',
      custom: { ...(reg.custom_field_values || {}) },
    })
  }

  const closeCompEdit = () => setEditingReg(null)

  const saveCompEdit = async () => {
    if (!editingReg || savingEdit) return
    const error = validateCompetitionRegForm(editValues, editingReg.custom_fields)
    if (error) {
      Taro.showToast({ title: error, icon: 'none' })
      return
    }
    setSavingEdit(true)
    try {
      await updateCompetitionRegistration(editingReg.id, {
        school: editValues.school.trim(),
        real_name: editValues.real_name.trim(),
        phone: editValues.phone.trim(),
        custom_field_values:
          Object.keys(editValues.custom).length > 0 ? editValues.custom : undefined,
      })
      Taro.showToast({ title: '已保存', icon: 'success' })
      setEditingReg(null)
      load()
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '保存失败',
        icon: 'none',
        duration: 3000,
      })
    } finally {
      setSavingEdit(false)
    }
  }

  const promptCorrectionField = async (
    field: string,
    currentValue: string,
  ): Promise<string | null> => {
    const labels: Record<string, string> = {
      phone: '手机号', email: '邮箱', school: '学校/单位', address: '通信地址',
      verify_code: '学籍验证码', pinyin: '拼音', major: '专业', province: '报考省份',
      gender: '性别', age: '年龄', education: '最高学历', zip_code: '邮编',
    }
    const result = await Taro.showModal({
      title: `补正${labels[field] || field}`,
      editable: true,
      placeholderText: `请输入正确的${labels[field] || field}`,
      content: currentValue,
      confirmText: '确定',
      cancelText: '取消',
    } as never)
    const editableResult = result as unknown as { confirm?: boolean; content?: string }
    if (!editableResult.confirm) return null
    return String(editableResult.content || '').trim()
  }

  const uploadH3c = async (registration: H3cRegistrationCard) => {
    const correction = registration.pending_correction
    const fieldValues: Record<string, string> = {}
    for (const field of correction?.allowed_fields || []) {
      const value = await promptCorrectionField(
        field,
        String(registration.candidate_snapshot[field] ?? ''),
      )
      if (value === null || !value) return
      fieldValues[field] = value
    }

    const materialTypes = (
      correction?.allowed_material_types
      ?? registration.latest_review?.rejected_material_types
      ?? []
    ).filter(type => type === 'coupon_proof' || type === 'student_proof')
    const materialValues: Record<string, string> = {}
    for (const materialType of materialTypes) {
      try {
        const result = await Taro.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
        const filePath = result.tempFilePaths[0]
        if (!filePath) return
        Taro.showLoading({ title: '上传中', mask: true })
        const uploaded = await h3cService.uploadMaterial(
          filePath, registration.batch_id, materialType,
        )
        materialValues[materialType] = uploaded.storage_key
      } catch (err) {
        if (isUserCancelled(err)) return
        throw err
      } finally {
        Taro.hideLoading()
      }
    }

    await h3cService.resubmitMaterials(registration.id, {
      phone: fieldValues.phone ?? null,
      email: fieldValues.email ?? null,
      school: fieldValues.school ?? null,
      address: fieldValues.address ?? null,
      verify_code: fieldValues.verify_code ?? null,
      coupon_proof_key: materialValues.coupon_proof ?? null,
      student_proof_key: materialValues.student_proof ?? null,
    })
    Taro.showToast({ title: '补正已提交', icon: 'success' })
    setSelected(null)
    load()
  }

  const uploadNisp = async (registration: NispRegistrationCard) => {
    const correction = registration.pending_correction
    const fieldValues: Record<string, string> = {}
    for (const field of correction?.allowed_fields || []) {
      const value = await promptCorrectionField(
        field,
        String(registration.candidate_snapshot[field] ?? ''),
      )
      if (value === null || !value) return
      fieldValues[field] = value
    }

    const materialTypes = (
      correction?.allowed_material_types
      ?? registration.latest_review?.rejected_material_types
      ?? []
    ).filter((type): type is NispMaterialType => type in NISP_MATERIAL_LABELS)
    const payload: Partial<Record<NispMaterialType, string>> = {}
    for (const materialType of materialTypes) {
      Taro.showToast({ title: `请选择${NISP_MATERIAL_LABELS[materialType]}`, icon: 'none' })
      const filePath = await chooseNispFile(materialType)
      if (!filePath) return
      Taro.showLoading({ title: '上传中', mask: true })
      const uploaded = await nispService.uploadMaterial(filePath, materialType)
      payload[materialType] = uploaded.storage_key
    }

    await nispService.resubmitMaterials(registration.id, {
      pinyin: fieldValues.pinyin ?? null,
      phone: fieldValues.phone ?? null,
      email: fieldValues.email ?? null,
      school: fieldValues.school ?? null,
      major: fieldValues.major ?? null,
      province: fieldValues.province ?? null,
      gender: fieldValues.gender ?? null,
      age: fieldValues.age ? Number(fieldValues.age) : null,
      education: fieldValues.education ?? null,
      address: fieldValues.address ?? null,
      zip_code: fieldValues.zip_code ?? null,
      id_card_both_sides_key: payload.id_card_both_sides ?? null,
      portrait_photo_key: payload.portrait_photo ?? null,
      xuexin_report_key: payload.xuexin_report ?? null,
      application_form_key: payload.application_form ?? null,
    })
    Taro.showToast({ title: '补正已提交', icon: 'success' })
    setSelected(null)
    load()
  }

  const upload = async (registration: UnifiedRegistration) => {
    if (registration.type === 'H3C') {
      await uploadH3c(registration)
      return
    }
    await uploadNisp(registration)
  }

  const cancelPayment = async (registration: UnifiedRegistration) => {
    Taro.showModal({
      title: '取消报名',
      content: `确定要取消报名 ${registration.registration_no} 吗？`,
      confirmText: '确定取消',
      cancelText: '再想想',
      success: async (res) => {
        if (!res.confirm) return
        try {
          if (registration.type === 'H3C') {
            await h3cService.cancelPayment(registration.id)
          } else {
            await nispService.cancelPayment(registration.id)
          }
          Taro.showToast({ title: '已取消', icon: 'success' })
          setSelected(null)
          load()
        } catch (err) {
          Taro.showToast({
            title: err instanceof Error ? err.message : '取消失败',
            icon: 'none',
          })
        }
      },
    })
  }

  const snapshotEntries = (registration: UnifiedRegistration) =>
    Object.entries(registration.candidate_snapshot)
      .filter(([key]) => key !== 'exam_date' && key !== 'exam_location' && FIELD_LABELS[key])
      .map(([key, value]) => ({ label: FIELD_LABELS[key], value: String(value ?? '-') }))

  const registrationTypeLabel = (registration: UnifiedRegistration) => (
    registration.type === 'H3C'
      ? TYPE_LABELS[registration.registration_type] || registration.registration_type
      : `NISP ${registration.levelLabel}`
  )

  const selectedExamDate = selected?.type === 'H3C'
    ? selected.exam_date
    : snapshotText(selected?.candidate_snapshot, 'exam_date')
  const selectedExamLocation = selected?.type === 'H3C'
    ? selected.exam_location
    : snapshotText(selected?.candidate_snapshot, 'exam_location')

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

          {!loading && !error && items.length === 0 && compRegs.length === 0 && (
            <View className={styles.empty}>
              <Text>暂无报名记录</Text>
              <Text className={styles.emptyHint}>去认证专区选择认证开始报名</Text>
            </View>
          )}

          {!loading && !error && compRegs.length > 0 && (
            <Text className={styles.sectionTitle}>竞赛报名</Text>
          )}
          {!loading && !error && compRegs.map((reg) => (
            <View key={`comp-${reg.id}`} className={styles.card} onClick={() => openCompReg(reg)}>
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
              <View key={`${item.type}-${item.id}`} className={styles.card} onClick={() => openDetail(item)}>
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

              {selected.status === 'approved' && (selectedExamDate || selectedExamLocation) && (
                <>
                  <Text className={styles.sectionTitle}>考试安排</Text>
                  {selectedExamDate && (
                    <View className={styles.row}>
                      <Text className={styles.label}>考试时间</Text>
                      <Text className={styles.value}>{formatExamDate(selectedExamDate)}</Text>
                    </View>
                  )}
                  {selectedExamLocation && (
                    <View className={styles.row}>
                      <Text className={styles.label}>考试地点</Text>
                      <Text className={styles.value}>{selectedExamLocation}</Text>
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
                    <Text>{selected.pending_correction ? '提交补正' : '补交材料'}</Text>
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

        {editingReg && (
          <View className={styles.detailMask} onClick={closeCompEdit}>
            <View className={styles.detailSheet} onClick={(e) => e.stopPropagation()}>
              <View className={styles.detailBar} onClick={closeCompEdit} />
              <Text className={styles.detailTitle}>{editingReg.competition_name}</Text>
              <Text className={styles.detailSubtitle}>{editingReg.track || '竞赛报名'}</Text>

              {editingReg.editable ? (
                <>
                  <CompetitionRegForm
                    fields={editingReg.custom_fields}
                    values={editValues}
                    onChange={setEditValues}
                  />
                  <View className={styles.actionRow}>
                    <View
                      className={`${styles.actionBtn} ${styles.actionPrimary}`}
                      onClick={saveCompEdit}
                    >
                      <Text>{savingEdit ? '保存中…' : '保存修改'}</Text>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <Text className={styles.sectionTitle}>报名信息</Text>
                  <View className={styles.row}>
                    <Text className={styles.label}>学校</Text>
                    <Text className={styles.value}>{editingReg.school}</Text>
                  </View>
                  <View className={styles.row}>
                    <Text className={styles.label}>姓名</Text>
                    <Text className={styles.value}>{editingReg.real_name || '-'}</Text>
                  </View>
                  <View className={styles.row}>
                    <Text className={styles.label}>手机号</Text>
                    <Text className={styles.value}>{editingReg.phone || '-'}</Text>
                  </View>
                  {Object.entries(editingReg.custom_field_values || {}).map(([key, value]) => {
                    const label = editingReg.custom_fields?.find((f) => f.key === key)?.label || key
                    const text = Array.isArray(value) ? value.join('、') : String(value ?? '-')
                    return (
                      <View className={styles.row} key={key}>
                        <Text className={styles.label}>{label}</Text>
                        <Text className={styles.value}>{text}</Text>
                      </View>
                    )
                  })}
                  <View className={styles.row}>
                    <Text className={styles.label}>报名时间</Text>
                    <Text className={styles.value}>{formatDateTime(editingReg.created_at, '-')}</Text>
                  </View>
                  <View className={styles.rejectReason}>
                    <Text>报名已截止，信息仅可查看；如需修改请联系管理员</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}
      </View>
    </AuthGuard>
  )
}
