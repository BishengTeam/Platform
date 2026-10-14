import { useCallback, useEffect, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { RefreshableScrollView } from '@/components/RefreshableScrollView'
import {
  CompetitionRegForm,
  isFixedFieldAlias,
  validateCompetitionRegForm,
  type CompetitionRegFormValues,
} from '@/components/CompetitionRegForm'
import { ConsultationGroupCard } from '@/components/ConsultationGroupCard'
import { ROUTES } from '@/constants/routes'
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
import {
  rensheService,
  type RensheApplicationDetail,
  type RenshePlan,
} from '@/services/rensheService'
import type { H3cRegistration } from '@/types/h3c'
import type { CompetitionMyRegistration } from '@/types'
import sharedStyles from './registrations.module.scss'
import styles from './registration-detail.module.scss'

type RegistrationKind = 'h3c' | 'nisp' | 'competition' | 'renshe'
type H3cRegistrationDetail = H3cRegistration & { kind: 'H3C' }
type NispRegistrationDetail = NispRegistration & {
  kind: 'NISP'
  levelLabel: string
}
type CertificationRegistrationDetail = H3cRegistrationDetail | NispRegistrationDetail

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending_payment: { label: '待支付', cls: sharedStyles.statusPending },
  pending_review: { label: '审核中', cls: sharedStyles.statusReview },
  rejected_awaiting_resubmission: { label: '待补交材料', cls: sharedStyles.statusRejected },
  pending_refund_confirmation: { label: '待确认退款', cls: sharedStyles.statusPending },
  refund_processing: { label: '退款中', cls: sharedStyles.statusPending },
  approved: { label: '审核通过', cls: sharedStyles.statusApproved },
  final_approved: { label: '终审通过', cls: sharedStyles.statusApproved },
  refunded_closed: { label: '已退款关闭', cls: sharedStyles.statusNeutral },
  cancelled: { label: '已取消', cls: sharedStyles.statusNeutral },
  draft: { label: '草稿', cls: sharedStyles.statusNeutral },
  pending_initial_review: { label: '待初审', cls: sharedStyles.statusReview },
  initial_rejected: { label: '待补正 · 初审退回', cls: sharedStyles.statusRejected },
  pending_external_review: { label: '待外审', cls: sharedStyles.statusReview },
  external_rejected: { label: '待补正 · 外审退回', cls: sharedStyles.statusRejected },
  external_approved: { label: '外审通过', cls: sharedStyles.statusApproved },
  closed: { label: '已关闭', cls: sharedStyles.statusNeutral },
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

function parseRegistrationKind(value: string | undefined): RegistrationKind | null {
  if (
    value === 'h3c'
    || value === 'nisp'
    || value === 'competition'
    || value === 'renshe'
  ) return value
  return null
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

function snapshotEntries(snapshot: Record<string, unknown>) {
  return Object.entries(snapshot)
    .filter(([key]) => key !== 'exam_date' && key !== 'exam_location' && FIELD_LABELS[key])
    .map(([key, value]) => ({ label: FIELD_LABELS[key], value: String(value ?? '-') }))
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

function competitionEditValues(
  registration: CompetitionMyRegistration,
): CompetitionRegFormValues {
  return {
    school: registration.school || '',
    real_name: registration.real_name || '',
    phone: registration.phone || '',
    // 别名键（name/school/phone_number）由固定三项承载，回填时剔除避免重复
    custom: Object.fromEntries(
      Object.entries(registration.custom_field_values || {}).filter(([key]) => !isFixedFieldAlias(key)),
    ),
  }
}

export default function RegistrationDetailPage() {
  const { params } = useRouter()
  const kind = parseRegistrationKind(params?.type)
  const registrationId = Number(params?.id)

  const [certRegistration, setCertRegistration] = useState<CertificationRegistrationDetail | null>(null)
  const [rensheRegistration, setRensheRegistration] = useState<RensheApplicationDetail | null>(null)
  const [renshePlan, setRenshePlan] = useState<RenshePlan | null>(null)
  const [competitionRegistration, setCompetitionRegistration] = useState<CompetitionMyRegistration | null>(null)
  const [editValues, setEditValues] = useState<CompetitionRegFormValues>({
    school: '',
    real_name: '',
    phone: '',
    custom: {},
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (!kind || !Number.isInteger(registrationId) || registrationId <= 0) {
      setCertRegistration(null)
      setCompetitionRegistration(null)
      setRensheRegistration(null)
      setRenshePlan(null)
      setError('报名链接无效')
      setLoading(false)
      return
    }

    try {
      setCertRegistration(null)
      setCompetitionRegistration(null)

      if (kind === 'h3c') {
        const detail = await h3cService.getRegistration(registrationId)
        setCertRegistration({ ...detail, kind: 'H3C' })
        return
      }

      if (kind === 'nisp') {
        const detail = await nispService.getRegistration(registrationId)
        setCertRegistration({
          ...detail,
          kind: 'NISP',
          levelLabel: detail.level === '1' ? '一级' : '二级',
        })
        return
      }

      if (kind === 'renshe') {
        const detail = await rensheService.getApplication(registrationId)
        const plan = await rensheService.getBatch(detail.plan_id).catch(() => null)
        setRensheRegistration(detail)
        setRenshePlan(plan)
        return
      }

      const competitions = await getMyCompetitionRegistrations()
      const detail = competitions.find(item => item.id === registrationId)
      if (!detail) {
        setError('报名记录不存在或已失效')
        return
      }
      setCompetitionRegistration(detail)
      setEditValues(competitionEditValues(detail))
    } catch {
      setError('加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [kind, registrationId])

  useEffect(() => {
    void load()
  }, [load])

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

  const uploadH3c = async (registration: H3cRegistration): Promise<boolean> => {
    const correction = registration.pending_correction
    const fieldValues: Record<string, string> = {}
    for (const field of correction?.allowed_fields || []) {
      const value = await promptCorrectionField(
        field,
        String(registration.candidate_snapshot[field] ?? ''),
      )
      if (value === null || !value) return false
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
        const result = await Taro.chooseImage({
          count: 1,
          sizeType: ['compressed'],
          sourceType: ['album', 'camera'],
        })
        const filePath = result.tempFilePaths[0]
        if (!filePath) return false
        Taro.showLoading({ title: '上传中', mask: true })
        const uploaded = await h3cService.uploadMaterial(
          filePath, registration.batch_id, materialType,
        )
        materialValues[materialType] = uploaded.storage_key
      } catch (err) {
        if (isUserCancelled(err)) return false
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
    return true
  }

  const uploadNisp = async (registration: NispRegistration): Promise<boolean> => {
    const correction = registration.pending_correction
    const fieldValues: Record<string, string> = {}
    for (const field of correction?.allowed_fields || []) {
      const value = await promptCorrectionField(
        field,
        String(registration.candidate_snapshot[field] ?? ''),
      )
      if (value === null || !value) return false
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
      let filePath = ''
      try {
        filePath = await chooseNispFile(materialType)
      } catch (err) {
        if (isUserCancelled(err)) return false
        throw err
      }
      if (!filePath) return false

      Taro.showLoading({ title: '上传中', mask: true })
      try {
        const uploaded = await nispService.uploadMaterial(filePath, materialType)
        payload[materialType] = uploaded.storage_key
      } finally {
        Taro.hideLoading()
      }
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
    return true
  }

  const submitCorrection = async () => {
    if (!certRegistration || actionLoading) return
    setActionLoading(true)
    try {
      const submitted = certRegistration.kind === 'H3C'
        ? await uploadH3c(certRegistration)
        : await uploadNisp(certRegistration)
      if (!submitted) return
      Taro.showToast({ title: '补正已提交', icon: 'success' })
      await load()
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '提交失败',
        icon: 'none',
        duration: 3000,
      })
    } finally {
      setActionLoading(false)
    }
  }

  const cancelPayment = () => {
    if (!certRegistration || actionLoading) return
    Taro.showModal({
      title: '取消报名',
      content: `确定要取消报名 ${certRegistration.registration_no} 吗？`,
      confirmText: '确定取消',
      cancelText: '再想想',
      success: async (res: { confirm?: boolean; content?: string }) => {
        if (!res.confirm) return
        setActionLoading(true)
        try {
          if (certRegistration.kind === 'H3C') {
            await h3cService.cancelPayment(certRegistration.id)
          } else {
            await nispService.cancelPayment(certRegistration.id)
          }
          Taro.showToast({ title: '已取消', icon: 'success' })
          await load()
        } catch (err) {
          Taro.showToast({
            title: err instanceof Error ? err.message : '取消失败',
            icon: 'none',
          })
        } finally {
          setActionLoading(false)
        }
      },
    })
  }

  const saveCompetitionEdit = async () => {
    if (!competitionRegistration || savingEdit) return
    const validationError = validateCompetitionRegForm(
      editValues,
      competitionRegistration.custom_fields,
    )
    if (validationError) {
      Taro.showToast({ title: validationError, icon: 'none' })
      return
    }

    setSavingEdit(true)
    try {
      await updateCompetitionRegistration(competitionRegistration.id, {
        school: editValues.school.trim(),
        real_name: editValues.real_name.trim(),
        phone: editValues.phone.trim(),
        custom_field_values:
          Object.keys(editValues.custom).length > 0 ? editValues.custom : undefined,
      })
      Taro.showToast({ title: '已保存', icon: 'success' })
      await load()
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

  const cancelRenshePayment = () => {
    if (!rensheRegistration || actionLoading) return
    Taro.showModal({
      title: '取消待支付报名',
      content: '确定取消本次人社认证报名吗？已填写的版本历史会保留。',
      confirmText: '确定取消',
      cancelText: '再想想',
      success: async (res) => {
        if (!res.confirm || !rensheRegistration) return
        setActionLoading(true)
        try {
          await rensheService.cancelPayment(rensheRegistration.id)
          Taro.showToast({ title: '已取消', icon: 'success' })
          await load()
        } catch (error) {
          Taro.showToast({
            title: error instanceof Error ? error.message : '取消失败',
            icon: 'none',
          })
        } finally {
          setActionLoading(false)
        }
      },
    })
  }

  const requestRensheRefund = () => {
    if (!rensheRegistration || actionLoading) return
    Taro.showModal({
      title: '申请人社报名退款',
      editable: true,
      placeholderText: '请填写退款原因',
      confirmText: '提交申请',
      cancelText: '取消',
      success: async (res: { confirm?: boolean; content?: string }) => {
        if (!res.confirm || !rensheRegistration) return
        const reason = String((res as unknown as { content?: string }).content || '').trim()
        if (!reason) {
          Taro.showToast({ title: '请填写退款原因', icon: 'none' })
          return
        }
        setActionLoading(true)
        try {
          await rensheService.requestRefund(
            rensheRegistration.id,
            reason,
            rensheRegistration.status === 'external_approved' ? 'exception' : 'normal',
          )
          Taro.showToast({ title: '退款申请已提交', icon: 'success' })
          await load()
        } catch (error) {
          Taro.showToast({
            title: error instanceof Error ? error.message : '退款申请失败',
            icon: 'none',
            duration: 3000,
          })
        } finally {
          setActionLoading(false)
        }
      },
    } as never)
  }

  const copyNispLoginPhone = async (phone: string) => {
    try {
      await Taro.setClipboardData({ data: phone })
    } catch {
      Taro.showToast({ title: '复制失败，请手动记录', icon: 'none' })
    }
  }

  const registrationTypeLabel = certRegistration
    ? certRegistration.kind === 'H3C'
      ? TYPE_LABELS[certRegistration.registration_type] || certRegistration.registration_type
      : `NISP ${certRegistration.levelLabel}`
    : ''

  const examDate = certRegistration?.kind === 'H3C'
    ? certRegistration.exam_date
    : snapshotText(certRegistration?.candidate_snapshot, 'exam_date')
  const examLocation = certRegistration?.kind === 'H3C'
    ? certRegistration.exam_location
    : snapshotText(certRegistration?.candidate_snapshot, 'exam_location')
  const nispPhone = certRegistration?.kind === 'NISP'
    ? snapshotText(certRegistration.candidate_snapshot, 'phone')
    : null

  const showCorrectionAction = certRegistration?.status === 'rejected_awaiting_resubmission'
  const showCancelAction = certRegistration?.status === 'pending_payment'
  const showCompetitionSave = Boolean(competitionRegistration?.editable)
  const showRensheCorrection = Boolean(
    rensheRegistration
    && (rensheRegistration.status === 'initial_rejected'
      || rensheRegistration.status === 'external_rejected'),
  )
  const showRensheCancel = rensheRegistration?.status === 'pending_payment'
  const showRenshePay = rensheRegistration?.status === 'pending_payment'
    && Boolean(rensheRegistration.current_order_id)
  const showRensheRefund = Boolean(
    rensheRegistration
    && rensheRegistration.current_order_status
    && ['paid', 'completed'].includes(rensheRegistration.current_order_status)
    && rensheRegistration.status !== 'closed'
    && !['requested', 'approved', 'processing', 'failed']
      .includes(rensheRegistration.current_refund_status || ''),
  )
  const showActionFooter = Boolean(
    showCorrectionAction
    || showCancelAction
    || showCompetitionSave
    || showRensheCorrection
    || showRensheCancel
    || showRenshePay
    || showRensheRefund,
  )

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader
          title={kind === 'competition' ? '竞赛报名详情' : kind === 'renshe' ? '人社报名详情' : '认证报名详情'}
          shouldShowBack
          fallbackUrl={`/${ROUTES.MINE_REGISTRATIONS}`}
        />
        <RefreshableScrollView
          className={`${styles.body} ${showActionFooter ? styles.bodyWithFooter : ''}`}
          onRefresh={load}
        >
          {loading && <View className={styles.placeholder}>加载中...</View>}

          {!loading && error && (
            <View className={styles.placeholder}>
              <Text>{error}</Text>
              {kind && Number.isInteger(registrationId) && registrationId > 0 && (
                <View className={styles.retryBtn} onClick={() => { void load() }}>
                  <Text>重新加载</Text>
                </View>
              )}
            </View>
          )}

          {!loading && !error && certRegistration && (
            <View className={styles.contentCard}>
              <View className={styles.header}>
                <Text className={styles.title}>{certRegistration.registration_no}</Text>
                <Text className={`${sharedStyles.status} ${STATUS_CONFIG[certRegistration.status]?.cls || ''}`}>
                  {STATUS_CONFIG[certRegistration.status]?.label || certRegistration.status}
                </Text>
              </View>
              <Text className={styles.subtitle}>{registrationTypeLabel}</Text>

              {certRegistration.status === 'rejected_awaiting_resubmission'
                && certRegistration.latest_review && (
                <View className={sharedStyles.rejectReason}>
                  <Text>
                    拒绝原因：{certRegistration.latest_review.reason_detail
                      || certRegistration.latest_review.reason_code
                      || '请联系客服'}
                  </Text>
                </View>
              )}

              {certRegistration.kind === 'NISP'
                && certRegistration.status === 'final_approved' && (
                <View className={sharedStyles.finalApprovedCard}>
                  <Text className={sharedStyles.finalApprovedTitle}>终审已通过</Text>
                  <Text className={sharedStyles.finalApprovedText}>
                    请前往 NISP 官网 www.cisp.cn 登录并查询证书信息。登录账号为报名时填写的手机号。
                  </Text>
                  <View className={sharedStyles.loginAccountRow}>
                    <Text className={sharedStyles.loginAccountLabel}>NISP 官网</Text>
                    <Text className={sharedStyles.loginAccountValue}>www.cisp.cn</Text>
                  </View>
                  <View className={sharedStyles.loginAccountRow}>
                    <Text className={sharedStyles.loginAccountLabel}>官网登录账号（手机号）</Text>
                    <Text className={sharedStyles.loginAccountValue}>{nispPhone || '-'}</Text>
                    {nispPhone && (
                      <View
                        className={sharedStyles.copyPhoneBtn}
                        onClick={() => { void copyNispLoginPhone(nispPhone) }}
                      >
                        <Text>复制</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {certRegistration.consultation_group && (
                <ConsultationGroupCard group={certRegistration.consultation_group} />
              )}

              {certRegistration.status === 'approved' && (examDate || examLocation) && (
                <>
                  <Text className={sharedStyles.sectionTitle}>考试安排</Text>
                  {examDate && (
                    <View className={sharedStyles.row}>
                      <Text className={sharedStyles.label}>考试时间</Text>
                      <Text className={sharedStyles.value}>{formatExamDate(examDate)}</Text>
                    </View>
                  )}
                  {examLocation && (
                    <View className={sharedStyles.row}>
                      <Text className={sharedStyles.label}>考试地点</Text>
                      <Text className={sharedStyles.value}>{examLocation}</Text>
                    </View>
                  )}
                </>
              )}

              <Text className={sharedStyles.sectionTitle}>报名信息</Text>
              {snapshotEntries(certRegistration.candidate_snapshot).map((entry) => (
                <View className={sharedStyles.row} key={entry.label}>
                  <Text className={sharedStyles.label}>{entry.label}</Text>
                  <Text className={sharedStyles.value}>{entry.value}</Text>
                </View>
              ))}

              <View className={sharedStyles.row}>
                <Text className={sharedStyles.label}>订单号</Text>
                <Text className={sharedStyles.value}>
                  {certRegistration.out_trade_no || '-'}
                </Text>
              </View>
              <View className={sharedStyles.row}>
                <Text className={sharedStyles.label}>报名金额</Text>
                <Text className={sharedStyles.value}>
                  {(certRegistration.price_cents / 100).toFixed(2)} 元
                </Text>
              </View>
              <View className={sharedStyles.row}>
                <Text className={sharedStyles.label}>报名时间</Text>
                <Text className={sharedStyles.value}>
                  {formatDateTime(certRegistration.created_at, '-')}
                </Text>
              </View>
            </View>
          )}

          {!loading && !error && rensheRegistration && (
            <View className={styles.contentCard}>
              <View className={styles.header}>
                <Text className={styles.title}>
                  {renshePlan?.name || `人社认证报名 #${rensheRegistration.id}`}
                </Text>
                <Text className={`${sharedStyles.status} ${STATUS_CONFIG[rensheRegistration.status]?.cls || ''}`}>
                  {STATUS_CONFIG[rensheRegistration.status]?.label || rensheRegistration.status}
                </Text>
              </View>
              <Text className={styles.subtitle}>
                {renshePlan?.occupation_name || '职业技能等级认证'}
              </Text>

              {rensheRegistration.latest_rejection_reason && (
                <View className={sharedStyles.rejectReason}>
                  <Text>
                    {rensheRegistration.latest_rejection_stage === 'external' ? '外审退回' : '初审退回'}：
                    {rensheRegistration.latest_rejection_reason}
                  </Text>
                </View>
              )}
              {Boolean(rensheRegistration.required_changes?.length) && (
                <View className={sharedStyles.rejectReason}>
                  <Text>待修改项：{rensheRegistration.required_changes?.join('、')}</Text>
                </View>
              )}

              <Text className={sharedStyles.sectionTitle}>报名信息</Text>
              <View className={sharedStyles.row}>
                <Text className={sharedStyles.label}>联系电话</Text>
                <Text className={sharedStyles.value}>
                  {rensheRegistration.draft_data?.contact_phone || '-'}
                </Text>
              </View>
              <View className={sharedStyles.row}>
                <Text className={sharedStyles.label}>电子邮箱</Text>
                <Text className={sharedStyles.value}>
                  {rensheRegistration.draft_data?.email || '-'}
                </Text>
              </View>
              <View className={sharedStyles.row}>
                <Text className={sharedStyles.label}>通讯地址</Text>
                <Text className={sharedStyles.value}>
                  {rensheRegistration.draft_data?.mailing_address || '-'}
                </Text>
              </View>
              <View className={sharedStyles.row}>
                <Text className={sharedStyles.label}>当前版本</Text>
                <Text className={sharedStyles.value}>
                  {rensheRegistration.current_version_id ? '已生成 immutable 版本' : '草稿'}
                </Text>
              </View>
              <View className={sharedStyles.row}>
                <Text className={sharedStyles.label}>提交时间</Text>
                <Text className={sharedStyles.value}>
                  {formatDateTime(rensheRegistration.submitted_at, '-')}
                </Text>
              </View>

              <Text className={sharedStyles.sectionTitle}>支付与退款</Text>
              <View className={sharedStyles.row}>
                <Text className={sharedStyles.label}>订单状态</Text>
                <Text className={sharedStyles.value}>
                  {rensheRegistration.current_order_status || '-'}
                </Text>
              </View>
              {rensheRegistration.current_refund_status && (
                <>
                  <View className={sharedStyles.row}>
                    <Text className={sharedStyles.label}>退款状态</Text>
                    <Text className={sharedStyles.value}>
                      {rensheRegistration.current_refund_status}
                    </Text>
                  </View>
                  {rensheRegistration.current_refund_retry_count != null && (
                    <View className={sharedStyles.row}>
                      <Text className={sharedStyles.label}>重试次数</Text>
                      <Text className={sharedStyles.value}>
                        {rensheRegistration.current_refund_retry_count}
                      </Text>
                    </View>
                  )}
                </>
              )}
              {rensheRegistration.frozen_at && (
                <View className={sharedStyles.rejectReason}>
                  <Text>退款处理中，报名资料已冻结：{rensheRegistration.freeze_reason || '-'}</Text>
                </View>
              )}

              {rensheRegistration.consultation_group && (
                <ConsultationGroupCard
                  group={rensheRegistration.consultation_group}
                />
              )}

              <Text className={sharedStyles.sectionTitle}>版本记录</Text>
              {rensheRegistration.versions.map(version => (
                <View className={sharedStyles.row} key={version.id}>
                  <Text className={sharedStyles.label}>V{version.version_no}</Text>
                  <Text className={sharedStyles.value}>
                    {formatDateTime(version.submitted_at, '-')}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {!loading && !error && competitionRegistration && (
            <View className={styles.contentCard}>
              <View className={styles.header}>
                <Text className={styles.title}>{competitionRegistration.competition_name}</Text>
                <Text className={styles.trackBadge}>
                  {competitionRegistration.track || '竞赛报名'}
                </Text>
              </View>

              {competitionRegistration.editable ? (
                <>
                  <Text className={sharedStyles.sectionTitle}>修改报名信息</Text>
                  <CompetitionRegForm
                    fields={competitionRegistration.custom_fields}
                    values={editValues}
                    onChange={setEditValues}
                  />
                </>
              ) : (
                <>
                  <Text className={sharedStyles.sectionTitle}>报名信息</Text>
                  <View className={sharedStyles.row}>
                    <Text className={sharedStyles.label}>学校</Text>
                    <Text className={sharedStyles.value}>{competitionRegistration.school}</Text>
                  </View>
                  <View className={sharedStyles.row}>
                    <Text className={sharedStyles.label}>姓名</Text>
                    <Text className={sharedStyles.value}>
                      {competitionRegistration.real_name || '-'}
                    </Text>
                  </View>
                  <View className={sharedStyles.row}>
                    <Text className={sharedStyles.label}>手机号</Text>
                    <Text className={sharedStyles.value}>
                      {competitionRegistration.phone || '-'}
                    </Text>
                  </View>
                  {Object.entries(competitionRegistration.custom_field_values || {}).filter(([key]) => !isFixedFieldAlias(key)).map(([key, value]) => {
                    const label = competitionRegistration.custom_fields
                      ?.find((field) => field.key === key)?.label || key
                    const text = Array.isArray(value)
                      ? value.join('、')
                      : String(value ?? '-')
                    return (
                      <View className={sharedStyles.row} key={key}>
                        <Text className={sharedStyles.label}>{label}</Text>
                        <Text className={sharedStyles.value}>{text}</Text>
                      </View>
                    )
                  })}
                  <View className={sharedStyles.row}>
                    <Text className={sharedStyles.label}>报名时间</Text>
                    <Text className={sharedStyles.value}>
                      {formatDateTime(competitionRegistration.created_at, '-')}
                    </Text>
                  </View>
                  <View className={sharedStyles.rejectReason}>
                    <Text>报名已截止，信息仅可查看；如需修改请联系管理员</Text>
                  </View>
                </>
              )}
            </View>
          )}
        </RefreshableScrollView>

        {showActionFooter && (
          <View className={styles.actionFooter}>
            {showCorrectionAction && (
              <View
                className={`${sharedStyles.actionBtn} ${sharedStyles.actionPrimary}`}
                onClick={() => { void submitCorrection() }}
              >
                <Text>{actionLoading ? '提交中…' : certRegistration?.pending_correction ? '提交补正' : '补交材料'}</Text>
              </View>
            )}

            {showCancelAction && (
              <View
                className={`${sharedStyles.actionBtn} ${sharedStyles.actionSecondary}`}
                onClick={cancelPayment}
              >
                <Text>{actionLoading ? '处理中…' : '取消报名'}</Text>
              </View>
            )}

            {showCompetitionSave && (
              <View
                className={`${sharedStyles.actionBtn} ${sharedStyles.actionPrimary}`}
                onClick={() => { void saveCompetitionEdit() }}
              >
                <Text>{savingEdit ? '保存中…' : '保存修改'}</Text>
              </View>
            )}

            {showRensheCorrection && rensheRegistration && (
              <View
                className={`${sharedStyles.actionBtn} ${sharedStyles.actionPrimary}`}
                onClick={() => Taro.navigateTo({
                  url: `/${ROUTES.RENSHE_FORM}?plan_id=${rensheRegistration.plan_id}&application_id=${rensheRegistration.id}`,
                })}
              >
                <Text>重新提交审核</Text>
              </View>
            )}

            {showRenshePay && rensheRegistration?.current_order_id && (
              <View
                className={`${sharedStyles.actionBtn} ${sharedStyles.actionPrimary}`}
                onClick={() => Taro.navigateTo({
                  url: `/${ROUTES.REGISTRATION_CONFIRM}?order_id=${rensheRegistration.current_order_id}`,
                })}
              >
                <Text>继续支付</Text>
              </View>
            )}

            {showRensheCancel && (
              <View
                className={`${sharedStyles.actionBtn} ${sharedStyles.actionSecondary}`}
                onClick={cancelRenshePayment}
              >
                <Text>{actionLoading ? '处理中…' : '取消报名'}</Text>
              </View>
            )}

            {showRensheRefund && (
              <View
                className={`${sharedStyles.actionBtn} ${sharedStyles.actionSecondary}`}
                onClick={requestRensheRefund}
              >
                <Text>{actionLoading ? '提交中…' : '申请退款'}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </AuthGuard>
  )
}
