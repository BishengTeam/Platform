import { useCallback, useEffect, useRef, useState } from 'react'
import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { FormInput } from '@/components/FormInput'
import { RegistrationSubmitBar } from '@/components/RegistrationParts'
import { PriceRow } from '@/components/PriceRow'
import { useIdentityCheck } from '@/hooks/useIdentityCheck'
import { useCertificationBatchClock } from '@/hooks/useCertificationBatchClock'
import { assertCertificationBatchOpen, certificationBatchState, formatCertificationApplyRange } from '@/utils/certificationBatch'
import { ROUTES } from '@/constants/routes'
import { getUserProfile } from '@/services/dataService'
import {
  rensheService,
  type RensheApplicationDetail,
  type RenshePlan,
  type RensheReportingInfo,
  type RensheReportingOptions,
} from '@/services/rensheService'
import type { UserProfileAggregated } from '@/types/profile'
import { ensureAgreementSigned } from '@/utils/agreementGate'
import { formatDateTime } from '@/utils/format'
import { validateEmail, validatePhone, validateRequired } from '@/utils/validator'
import type { ValidationResult } from '@/utils/validator'
import styles from './renshe.module.scss'
import GraduatedForm from './graduated-form'
import ReportingFields from './reporting-fields'
import { correctionAvailable, validateReportingInfo, isSelfReportedRule, rensheBatchWindow } from '@/utils/rensheGraduated'

export default function RensheFormPage() {
  const [planId, setPlanId] = useState(0)
  const [applicationId, setApplicationId] = useState<number | null>(null)
  const [plan, setPlan] = useState<RenshePlan | null>(null)
  const [application, setApplication] = useState<RensheApplicationDetail | null>(null)
  const [profile, setProfile] = useState<UserProfileAggregated | null>(null)
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [reporting, setReporting] = useState<Partial<RensheReportingInfo>>({})
  const [reportingOptions, setReportingOptions] = useState<RensheReportingOptions | null>(null)
  const [reportingError, setReportingError] = useState('')
  const [errors, setErrors] = useState<Record<string, ValidationResult>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const identity = useIdentityCheck()
  const [batchChecking, setBatchChecking] = useState(false)
  const [batchCheckError, setBatchCheckError] = useState('')
  const statusRequest = useRef(0)

  useLoad((options) => {
    setPlanId(Number(options?.plan_id || 0))
    setApplicationId(Number(options?.application_id || 0) || null)
  })

  const load = useCallback(async () => {
    if (!planId) return
    setLoading(true)
    setLoadError('')
    try {
      const [planDetail, profileDetail, applicationDetail] = await Promise.all([
        rensheService.getBatch(planId),
        getUserProfile(),
        applicationId
          ? rensheService.getApplication(applicationId)
          : rensheService.findActiveApplication(planId),
      ])
      if (applicationDetail && applicationDetail.plan_id !== planDetail.id) throw new Error('报名与批次不一致，请从我的报名重新进入')
      setPlan(planDetail)
      setProfile(profileDetail)
      setApplication(applicationDetail)
      const draft = applicationDetail?.draft_data
      setPhone(draft?.contact_phone || profileDetail?.profile.phone || '')
      setEmail(draft?.email || profileDetail?.profile.email || '')
      setAddress(draft?.mailing_address || profileDetail?.profile.address || '')
      if (!isSelfReportedRule(planDetail.renshe_config?.qualification_rule)) {
        setReportingOptions(await rensheService.getReportingOptions(planDetail.id))
        setReporting(draft?.reporting_info || { ethnicity: profileDetail?.realname?.ethnicity || '', political_status: profileDetail?.realname?.political_status || '' })
      }
    } catch (error) {
      setPlan(null)
      setLoadError(error instanceof Error ? error.message : '报名信息加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [applicationId, planId])

  useEffect(() => { void load() }, [load])
  const refreshAvailability = useCallback(async () => {
    if (!planId) return
    const request = ++statusRequest.current
    setBatchChecking(true); setBatchCheckError('')
    try {
      const [latestPlan, latestApplication] = await Promise.all([
        rensheService.getBatch(planId),
        application?.id ? rensheService.getApplication(application.id) : Promise.resolve(null),
      ])
      if (request !== statusRequest.current) return
      if (latestApplication && latestApplication.current_version_id !== application?.current_version_id) { setBatchCheckError('报名版本已变化，请返回报名详情重新进入'); return }
      setPlan(latestPlan)
      if (latestApplication) setApplication(latestApplication)
    } catch (error) { if (request === statusRequest.current) setBatchCheckError(error instanceof Error ? error.message : '批次状态核验失败，请重试') }
    finally { if (request === statusRequest.current) setBatchChecking(false) }
  }, [planId, application?.id, application?.current_version_id])
  useEffect(() => () => { statusRequest.current++ }, [])
  const now = useCertificationBatchClock(plan ? [plan] : [], refreshAvailability, Boolean(plan), [application?.correction_due_at])
  const availability = certificationBatchState(plan ? rensheBatchWindow(plan) : null, now)
  const correcting = Boolean(application && ['initial_rejected', 'external_rejected'].includes(application.status))
  const applicationEditable = correcting ? Boolean(plan && application && correctionAvailable(application, plan, now)) : (!application || application.status === 'draft') && availability.canApply
  const assertAvailable = () => {
    if (correcting) {
      if (!plan || !application || !correctionAvailable(application, plan, Date.now())) throw new Error('当前报名不在有效补正期内')
    } else assertCertificationBatchOpen(plan ? rensheBatchWindow(plan) : null)
  }

  const realname = profile?.realname
  const student = profile?.student
  const legacyMaterialChecks = [
    { label: '身份证正面', value: realname?.id_card_front_oss },
    { label: '身份证反面', value: realname?.id_card_back_oss },
    { label: '二寸免冠照', value: realname?.avatar_oss },
    { label: '学生证', value: student?.student_card_oss },
    { label: '学信网电子注册备案表', value: student?.enrollment_pdf_oss },
    { label: '学历证明', value: student?.degree_cert_oss },
  ]
  const sources: Record<string, string | null | undefined> = {
    id_card_front: realname?.id_card_front_oss, id_card_back: realname?.id_card_back_oss, portrait: realname?.avatar_oss,
    student_card: student?.student_card_oss, xuexin_registration: student?.enrollment_pdf_oss, education_proof: student?.degree_cert_oss,
  }
  const materialChecks = plan?.renshe_config?.materials.map(item => ({ label: item.name, value: sources[item.kind], required: item.required }))
    ?? legacyMaterialChecks.map(item => ({ ...item, required: true }))
  const identityReady = identity.phase === 'verified'
    && realname?.identity_status === 'verified'
    && student?.student_status === 'verified'
  const materialsReady = materialChecks.every(item => !item.required || Boolean(item.value))
  const canSubmit = identityReady && materialsReady && applicationEditable && !batchChecking && !batchCheckError && !submitting

  const handleValidate = useCallback(() => {
    const next: Record<string, ValidationResult> = {
      phone: validatePhone(phone),
      email: validateEmail(email),
      address: validateRequired(address, '通讯地址'),
    }
    setErrors(next)
    const reportingMessage = reportingOptions ? validateReportingInfo(reporting, reportingOptions) : '报送信息尚未加载，请重试'
    setReportingError(reportingMessage || '')
    return Object.values(next).every(item => item.valid) && !reportingMessage
  }, [address, email, phone, reporting, reportingOptions])

  const handleSubmit = async () => {
    if (!plan || !canSubmit || !handleValidate()) return
    try { assertAvailable() } catch (error) { Taro.showToast({ title: (error as Error).message, icon: 'none' }); return }
    if (!(await ensureAgreementSigned(
      'cert_registration',
      '认证报名信息处理授权协议',
      '提交人社认证报名前，请先阅读并同意授权协议',
    ))) return

    setSubmitting(true)
    try {
      assertAvailable()
      const saved = await rensheService.saveDraft({
        plan_id: plan.id,
        contact_phone: phone.trim(),
        mailing_address: address.trim(),
        email: email.trim(),
        reporting_info: { ...reporting, occupation_years: reporting.occupation_years === '' ? null : reporting.occupation_years } as RensheReportingInfo,
      })
      assertAvailable()
      const submitted = await rensheService.submit(saved.id)
      Taro.showToast({ title: '报名信息已提交', icon: 'success' })
      if (submitted.payment_required) {
        Taro.navigateTo({
          url: `/${ROUTES.REGISTRATION_CONFIRM}?order_id=${submitted.order_id}`,
        })
        return
      }
      if (!correcting) {
        Taro.redirectTo({ url: `/${ROUTES.PAYMENT_RESULT}?order_id=${submitted.order_id}` })
        return
      }
      Taro.redirectTo({
        url: `/${ROUTES.MINE_REGISTRATION_DETAIL}?type=renshe&id=${saved.id}`,
      })
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error ? error.message : '提交失败，请稍后重试',
        icon: 'none',
        duration: 3000,
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (identity.phase === 'checking' || loading) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title='人社认证报名' shouldShowBack />
          <View className={styles.loading}>加载中...</View>
        </View>
      </AuthGuard>
    )
  }

  if (!plan) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title='人社认证报名' shouldShowBack />
          <View className={styles.empty}><Text>{loadError || '批次不存在或已关闭'}</Text><Button onClick={() => void load()}>重新加载</Button></View>
        </View>
      </AuthGuard>
    )
  }

  if (isSelfReportedRule(plan.renshe_config?.qualification_rule)) {
    return <GraduatedForm key={`${plan.id}-${application?.id || 0}`} plan={plan} profile={profile} application={application} now={now} batchChecking={batchChecking} batchCheckError={batchCheckError} onRefreshBatch={refreshAvailability} />
  }

  if (identity.phase !== 'verified') {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title='实名认证检查' shouldShowBack />
          <View className={styles.body}>
            <View className={styles.card}>
              <Text className={styles.sectionTitle}>请先完成本人实名认证</Text>
              <Text className={styles.sectionDesc}>
                人社认证报名必须由本人提交。系统将锁定已审核通过的实名身份，不能在报名页手工更换姓名或身份证号。
              </Text>
              <Button
                variant='gradient'
                size='lg'
                className={styles.primaryButton}
                onClick={() => Taro.navigateTo({ url: '/pages/mine/edit-profile' })}
              >
                去完善实名与学生信息
              </Button>
            </View>
          </View>
        </View>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='人社认证报名' shouldShowBack />
        <ScrollView className={`${styles.body} ${styles.bodyWithFooter}`} scrollY>
          {(batchCheckError || batchChecking || !applicationEditable) && <View className={styles.warning}><Text>{batchChecking ? '正在核验批次状态…' : batchCheckError || (correcting ? '当前报名不在有效补正期内' : availability.message || '请在我的报名查看已提交的报名')}</Text><Button variant='secondary' onClick={() => void refreshAvailability()}>刷新批次状态</Button></View>}
          <View className={styles.card}>
            <View className={styles.cardHeader}>
              <Text className={styles.title}>{plan.name}</Text>
              <Text className={styles.badge}>{plan.occupation_name}</Text>
            </View>
            <View className={styles.row}><Text className={styles.label}>报考项目</Text><Text className={styles.value}>{plan.project_name || plan.occupation_name}</Text></View>
            <View className={styles.row}>
              <Text className={styles.label}>报名时间</Text>
              <Text className={styles.value}>
                {formatCertificationApplyRange(plan)}
              </Text>
            </View>
            <View className={styles.row}>
              <Text className={styles.label}>考试安排</Text>
              <Text className={styles.value}>
                {formatDateTime(plan.exam_date, '待定')} · {plan.exam_location || '以批次安排为准'}
              </Text>
            </View>
            <View className={styles.row}>
              <Text className={styles.label}>技能等级</Text>
              <Text className={styles.value}>{plan.skill_level || '待核实'}</Text>
            </View>
            <View className={styles.row}>
              <Text className={styles.label}>考试 / 申报</Text>
              <Text className={styles.value}>
                {plan.exam_type || '待核实'} · {plan.application_type || '待核实'}
              </Text>
            </View>
          </View>

          <View className={styles.card}>
            <Text className={styles.sectionTitle}>本人身份</Text>
            <View className={styles.row}>
              <Text className={styles.label}>姓名</Text>
              <Text className={styles.value}>{realname?.real_name || '-'}</Text>
            </View>
            <View className={styles.row}>
              <Text className={styles.label}>身份证号</Text>
              <Text className={styles.value}>{realname?.id_card || '-'}</Text>
            </View>
            <View className={styles.row}>
              <Text className={styles.label}>学校</Text>
              <Text className={styles.value}>{student?.school || '-'}</Text>
            </View>
            <View className={styles.row}>
              <Text className={styles.label}>专业</Text>
              <Text className={styles.value}>{student?.major || '-'}</Text>
            </View>
          </View>

          <View className={styles.card}>
            <Text className={styles.sectionTitle}>申报前材料检查</Text>
            <View className={styles.requirementList}>
              {materialChecks.map(item => (
                <View className={styles.requirementItem} key={item.label}>
                  {item.label}（{item.required ? '必填' : '选填'}）：{item.value ? '已提交' : '待提交'}
                </View>
              ))}
            </View>
            {!identityReady && (
              <View className={styles.warning}>
                实名或学生信息尚未审核通过，请先前往「我的-编辑资料」完成审核后再报名。
              </View>
            )}
            {identityReady && !materialsReady && (
              <View className={styles.warning}>
                本批次必填材料不完整，请先在「我的-编辑资料」补齐。提交后将保留本次材料版本。
              </View>
            )}
          </View>

          {application?.latest_rejection_reason && (
            <View className={styles.card}>
              <Text className={styles.sectionTitle}>补正要求</Text>
              <View className={styles.warning}>
                {application.latest_rejection_stage === 'external' ? '外审退回' : '初审退回'}：
                {application.latest_rejection_reason}
              </View>
              {Boolean(application.required_changes?.length) && (
                <View className={styles.requirementList}>
                  {application.required_changes?.map(change => (
                    <View className={styles.requirementItem} key={change}>{change}</View>
                  ))}
                </View>
              )}
            </View>
          )}

          <ReportingFields value={reporting} onChange={setReporting} options={reportingOptions} disabled={submitting} />
          {reportingError && <View className={styles.warning}>{reportingError}</View>}
          <View className={styles.card}>
            <Text className={styles.sectionTitle}>报名联系信息</Text>
            <FormInput compact
              label='联系电话'
              required
              placeholder='请输入手机号'
              value={phone}
              type='number'
              maxlength={11}
              error={errors.phone}
              onChange={setPhone}
            />
            <FormInput compact
              label='电子邮箱'
              required
              placeholder='用于接收报名和证书信息'
              value={email}
              error={errors.email}
              onChange={setEmail}
            />
            <FormInput compact
              label='通讯地址'
              required
              placeholder='请填写证书邮寄地址'
              value={address}
              maxlength={256}
              error={errors.address}
              onChange={setAddress}
            />
          </View>

          <View className={styles.card}>
            <Text className={styles.sectionTitle}>费用</Text>
            <PriceRow label='报名费' value={plan.price_cents / 100} />
            <PriceRow label='合计' value={plan.price_cents / 100} isTotal />
          </View>
        </ScrollView>

        <RegistrationSubmitBar priceCents={plan.price_cents} loading={submitting} disabled={!canSubmit}
          onSubmit={() => { void handleSubmit() }} label={!correcting && !availability.canApply ? availability.action : applicationId ? '重新提交审核' : '提交报名'} />
      </View>
    </AuthGuard>
  )
}
