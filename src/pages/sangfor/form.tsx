import { useEnrollmentConfirmation } from '@/hooks/useEnrollmentConfirmation'
import { ConfirmationSummary } from '@/components/CertificationEnrollment/ConfirmationSummary'
import { enrollmentContactDraft, enrollmentDetailUrl } from '@/utils/enrollment'
import { clearEnrollmentDraft, loadEnrollmentDraft, saveEnrollmentDraft } from '@/utils/enrollmentFormDraft'
import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { FormInput } from '@/components/FormInput'
import { Button } from '@/components/Button'
import { AgreementCheckbox } from '@/components/AgreementCheckbox'
import { CertAttachmentList } from '@/components/CertAttachmentList'
import { RegistrationSubmitBar, RegistrationSummary } from '@/components/RegistrationParts'
import { useAuth } from '@/hooks/useAuth'
import { useCertificationBatchClock } from '@/hooks/useCertificationBatchClock'
import { assertCertificationBatchOpen, certificationBatchState, formatCertificationApplyRange } from '@/utils/certificationBatch'
import { getUserProfile } from '@/services/userService'
import { sangforService, type SangforBatch, type SangforRegistration, type SangforValues } from '@/services/sangforService'
import { certificationJourneyService, type CertAttachmentItem } from '@/services/certificationJourney'
import { SANGFOR_LABELS, validateSangforForm, canApplySangfor } from '@/utils/sangforForm'
import { correctionAvailability } from '@/utils/correction'
import { serverNow } from '@/utils/timeSync'
import { createLatestGuard } from '@/utils/latestRequest'
import { ensureAgreementSigned } from '@/utils/agreementGate'
import { ROUTES } from '@/constants/routes'
import { formatDateTime } from '@/utils/format'
import styles from './sangfor.module.scss'

const INITIAL: SangforValues = { phone: '', organization: '', first_name: '', last_name: '', exam_voucher_code: '', email: '', mailing_address: '', remark1: '', remark2: '' }

export default function SangforFormPage() {
  const { isLoggedIn, sessionId } = useAuth()
  const [batchId, setBatchId] = useState(0), [registrationId, setRegistrationId] = useState(0), [routeReady, setRouteReady] = useState(false)
  const [batch, setBatch] = useState<SangforBatch | null>(null), [registration, setRegistration] = useState<SangforRegistration | null>(null)
  const [attachments, setAttachments] = useState<CertAttachmentItem[]>([])
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)
  const [attachmentsError, setAttachmentsError] = useState('')
  const [form, setForm] = useState<SangforValues>(INITIAL), [identity, setIdentity] = useState({ name: '', id: '', verified: false })
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(''), [retry, setRetry] = useState(0)
  const [errors, setErrors] = useState<Partial<Record<keyof SangforValues, string>>>({}), [submitError, setSubmitError] = useState('')
  const [agreed, setAgreed] = useState(false), [submitting, setSubmitting] = useState(false), [scrollTarget, setScrollTarget] = useState('')
  const lock = useRef(false)
  const draftReady = useRef(false)
  const [batchChecking, setBatchChecking] = useState(false), [batchCheckError, setBatchCheckError] = useState('')
  const statusRequest = useRef(0)
  const attachmentsGuard = useRef(createLatestGuard())
  const confirmation = useEnrollmentConfirmation('sangfor', batchId)
  useEffect(() => { setForm(INITIAL); setRegistration(null); setErrors({}); setSubmitError(''); setAgreed(false) }, [sessionId])
  useLoad(params => { setBatchId(Number(params?.batch_id || 0)); setRegistrationId(Number(params?.registration_id || 0)); setRouteReady(true) })
  useEffect(() => {
    if (!isLoggedIn || !routeReady) return
    let active = true
    setLoading(true); setLoadError(''); setBatch(null); setRegistration(null); setIdentity({ name: '', id: '', verified: false })
    const load = async () => {
      const profile = await getUserProfile()
      const realname = profile.realname
      if (!active) return
      setIdentity({ name: realname?.real_name || '', id: realname?.id_card_raw || '', verified: realname?.identity_status === 'verified' })
      if (registrationId) {
        const record = await sangforService.registration(registrationId)
        if (!active) return
        setRegistration(record)
        setForm(Object.fromEntries(Object.keys(INITIAL).map(key => [key, record.candidate_snapshot[key] || ''])) as unknown as SangforValues)
      } else {
        if (!Number.isSafeInteger(batchId) || batchId <= 0) throw new Error('批次无效，请返回列表重新选择')
        const info = await sangforService.batch(batchId)
        if (!active) return
        setBatch(info)
        setForm(old => ({ ...old, phone: old.phone || enrollmentContactDraft().phone || profile.profile.phone || '', email: old.email || enrollmentContactDraft().email || profile.profile.email || '', mailing_address: old.mailing_address || enrollmentContactDraft().address || '',
          organization: old.organization || profile.enterprise?.organization || '', first_name: old.first_name || realname?.first_name_en || '', last_name: old.last_name || realname?.last_name_en || '' }))
        // 本地暂存最后覆盖：考生明确填过的内容不被资料带出覆盖
        const local = loadEnrollmentDraft<Partial<SangforValues>>(`sangfor:${batchId}`)
        if (local) setForm(old => ({
          ...old,
          phone: local.phone || old.phone,
          organization: local.organization || old.organization,
          first_name: local.first_name || old.first_name,
          last_name: local.last_name || old.last_name,
          exam_voucher_code: local.exam_voucher_code || old.exam_voucher_code,
          email: local.email || old.email,
          mailing_address: local.mailing_address || old.mailing_address,
          remark1: local.remark1 || old.remark1,
          remark2: local.remark2 || old.remark2,
        }))
        draftReady.current = true
      }
    }
    void load().catch(reason => { if (active) setLoadError(reason instanceof Error ? reason.message : '报名信息加载失败') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [isLoggedIn, sessionId, routeReady, batchId, registrationId, retry])
  // 本地暂存：仅新建报名（非补正）；初始恢复完成前不写入，避免空表单覆盖已存草稿
  useEffect(() => {
    if (!batchId || registrationId || !draftReady.current) return
    saveEnrollmentDraft(`sangfor:${batchId}`, form)
  }, [batchId, registrationId, form])
  const refreshAvailability = useCallback(async () => {
    if (!isLoggedIn || !routeReady || loading) return
    const request = ++statusRequest.current
    setBatchChecking(true); setBatchCheckError('')
    try {
      if (registrationId) {
        const latest = await sangforService.registration(registrationId)
        if (request !== statusRequest.current) return
        if (registration && latest.revision !== registration.revision) { setBatchCheckError('报名版本已变化，请返回报名详情重新进入'); return }
        setRegistration(latest)
      } else {
        const latest = await sangforService.batch(batchId)
        if (request === statusRequest.current) setBatch(latest)
      }
    } catch (reason) { if (request === statusRequest.current) setBatchCheckError(reason instanceof Error ? reason.message : '批次状态核验失败，请重试') }
    finally { if (request === statusRequest.current) setBatchChecking(false) }
  }, [isLoggedIn, sessionId, routeReady, loading, registrationId, batchId, registration?.revision])
  useEffect(() => {
    statusRequest.current++; setBatchChecking(false); setBatchCheckError('')
    return () => { statusRequest.current++ }
  }, [sessionId, batchId, registrationId])
  const now = useCertificationBatchClock(batch ? [batch] : [], refreshAvailability, isLoggedIn && routeReady && !loading, [registration?.correction_due_at])
  const fetchAttachments = useCallback(async () => {
    const targetPlan = batchId || batch?.id || registration?.batch_id
    const token = attachmentsGuard.current.next()
    if (!targetPlan) { setAttachments([]); return }
    setAttachmentsLoading(true)
    setAttachmentsError('')
    try {
      const rows = await certificationJourneyService.planAttachments('sangfor', targetPlan)
      if (attachmentsGuard.current.isCurrent(token)) setAttachments(rows)
    } catch {
      if (!attachmentsGuard.current.isCurrent(token)) return
      setAttachments([])
      setAttachmentsError('附件加载失败，可稍后重试')
    } finally {
      if (attachmentsGuard.current.isCurrent(token)) setAttachmentsLoading(false)
    }
  }, [batchId, batch?.id, registration?.batch_id])
  useEffect(() => { void fetchAttachments() }, [fetchAttachments])
  const availability = certificationBatchState(batch ? { ...batch, can_apply: !!batch.exam_date } : null, now)
  const correction = correctionAvailability(
    registration?.status,
    registration?.correction_due_at,
    now,
  )
  const correctionAllowed = correction.open
  const registrationNotice = batch?.registration_notice
    || registration?.batch_snapshot?.registration_notice
    || (registration?.candidate_snapshot as unknown as {
      enrollment_notice?: { registration_notice?: string }
    } | undefined)?.enrollment_notice?.registration_notice
  const canSubmit = identity.verified && !loading && !loadError && !batchChecking && !batchCheckError && (registrationId ? correctionAllowed : !!batch && canApplySangfor(batch, now))
  const terminalBlocked = registrationId
    ? Boolean(registration) && !correctionAllowed
    : batch ? !canApplySangfor(batch, now) : false
  const blockReason = loading || loadError
    ? ''
    : batchChecking
      ? '正在核验批次状态…'
      : !identity.verified
        ? '请先完成本人实名认证后再提交'
        : registrationId
          ? (correctionAllowed ? '' : '当前报名不在有效补正期内')
          : (batch ? (canApplySangfor(batch, now) ? '' : availability.message) : '报名批次未加载')
  const assertAvailable = () => {
    if (registrationId) {
      const latest = correctionAvailability(
        registration?.status,
        registration?.correction_due_at,
        serverNow(),
      )
      if (!latest.open) throw new Error('当前报名不在有效补正期内')
    } else assertCertificationBatchOpen(batch ? { ...batch, can_apply: !!batch.exam_date } : null)
  }
  const submit = async () => {
    if (lock.current || !canSubmit) return
    try { assertAvailable() } catch (reason) { setSubmitError((reason as Error).message); return }
    const next = validateSangforForm(form)
    setErrors(next); setSubmitError('')
    const first = Object.keys(next)[0]
    if (first) { setScrollTarget(''); Taro.nextTick(() => setScrollTarget(`sangfor-${first}`)); return }
    if (!agreed) { setSubmitError('请先阅读并同意认证报名信息处理授权协议'); return }
    lock.current = true; setSubmitting(true)
    try {
      if (!(await ensureAgreementSigned('cert_registration', '认证报名信息处理授权协议', '提交报名前请阅读并同意认证报名信息处理授权协议'))) return
      assertAvailable()
      const values = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()])) as unknown as SangforValues
      if (registration) {
        const result = await sangforService.resubmit(registration.id, registration.revision, values)
        await Taro.redirectTo({ url: `/${ROUTES.SANGFOR_DETAIL}?id=${result.id}` })
      } else if (batch) {
        const result = await sangforService.create(batch.id, values, await confirmation.requireConfirmation())
        clearEnrollmentDraft(`sangfor:${batch.id}`)
        await Taro.redirectTo({ url: result.price_cents ? `/${ROUTES.REGISTRATION_CONFIRM}?order_id=${result.order_id}` : enrollmentDetailUrl('sangfor', result.id) })
      }
    } catch (reason) { setSubmitError(reason instanceof Error ? reason.message : '提交失败，请重试') }
    finally { lock.current = false; setSubmitting(false) }
  }
  const field = (key: keyof SangforValues, required = false, wide = false, maxLength = 128) => <View key={key} id={`sangfor-${key}`} className={wide ? styles.wide : undefined}>
    <FormInput compact label={SANGFOR_LABELS[key]} required={required} value={form[key]} placeholder={`请填写${SANGFOR_LABELS[key]}`} maxlength={maxLength} disabled={submitting || terminalBlocked}
      onChange={value => { setForm(old => ({ ...old, [key]: value })); setErrors(old => ({ ...old, [key]: undefined })) }} error={errors[key] ? { valid: false, message: errors[key]! } : undefined} />
  </View>
  const summary = registration?.batch_snapshot
  return <AuthGuard><View className={styles.page}><PageHeader title={registrationId ? '深信服报名补正' : '深信服认证报名'} shouldShowBack />
    <ScrollView className={styles.body} scrollY scrollIntoView={scrollTarget} scrollWithAnimation><View className={styles.content}>
      {loading && <View className={styles.empty}>加载中…</View>}
      {loadError && <View className={styles.card}><Text className={styles.error}>{loadError}</Text><Button variant='secondary' onClick={() => setRetry(value => value + 1)}>重新加载</Button></View>}
      {!loading && !loadError && <>
        {blockReason && <View className={styles.blockBanner}>
          <Text className={styles.blockReason}>{blockReason}</Text>
          <View className={styles.blockActions}>
            {registrationId && <Button variant='secondary' onClick={() => void Taro.redirectTo({ url: `/${ROUTES.SANGFOR_DETAIL}?id=${registrationId}` })}>返回报名详情</Button>}
            {!terminalBlocked && <Button variant='secondary' onClick={() => void refreshAvailability()}>刷新状态</Button>}
          </View>
        </View>}
        <ConfirmationSummary vendor='sangfor' batchId={batchId} notice={confirmation.notice} correcting={Boolean(registrationId)} contact={{ phone: form.phone, email: form.email, address: form.mailing_address }} disabled={submitting} />
        {registrationNotice && <View className={styles.card}>
          <Text className={styles.title}>报名注意事项</Text>
          <Text className={styles.hint}>{registrationNotice}</Text>
        </View>}
        <RegistrationSummary title={batch?.name || summary?.name || '深信服报名'} badge='深信服' subtitle={batch?.exam_direction || summary?.exam_direction} priceCents={batch?.price_cents ?? registration?.price_cents}
          items={[...(batch ? [{ label: '报名时间', value: formatCertificationApplyRange(batch), wide: true }] : []), { label: '考试时间', value: (batch?.exam_date || summary?.exam_date) ? formatDateTime(batch?.exam_date || summary?.exam_date || '') : '以通知为准', wide: true }, { label: '考试地点', value: batch?.exam_location || summary?.exam_location || '以通知为准', wide: true }]} />
        {batchCheckError && <View className={styles.card}><Text className={styles.error}>{batchCheckError}</Text><Button variant='secondary' onClick={() => void refreshAvailability()}>刷新批次状态</Button></View>}
        <View className={styles.card}><Text className={styles.title}>本人身份</Text><View className={styles.row}><Text className={styles.label}>姓名</Text><Text className={styles.value}>{identity.name || '未实名'}</Text></View>
          <View className={styles.row}><Text className={styles.label}>身份证号</Text><Text className={styles.value}>{identity.id ? `${identity.id.slice(0, 3)}***********${identity.id.slice(-4)}` : '未实名'}</Text></View>
          {!identity.verified && <Button variant='secondary' onClick={() => Taro.navigateTo({ url: '/pages/mine/edit-profile' })}>完成本人实名认证</Button>}</View>
        {registration && <View className={styles.card}><Text className={styles.title}>补正要求</Text><Text className={styles.hint}>{registration.reviews.slice(-1)[0]?.reason}</Text><Text className={styles.hint}>截止时间：{registration.correction_due_at ? formatDateTime(registration.correction_due_at) : '未设置'}。已付款报名补正无需重复付款。</Text></View>}
        <View className={styles.card}><Text className={styles.title}>报考信息</Text><Text className={styles.hint}>firstName填写名字拼音，lastName填写姓氏拼音。考试券码由考生提供，管理员核验后报送。</Text>
          <View className={styles.fields}>{field('first_name', true, false, 64)}{field('last_name', true, false, 64)}{field('organization', true, true)}{field('exam_voucher_code', true, true)}</View></View>
        <View className={styles.card}><Text className={styles.title}>联系信息</Text><View className={styles.fields}>{field('phone', true, false, 11)}{field('email')}{field('mailing_address', false, true, 256)}</View></View>
        <CertAttachmentList attachments={attachments} loading={attachmentsLoading} error={attachmentsError} onRetry={() => void fetchAttachments()} compact />
        <View className={styles.card}><Text className={styles.title}>补充说明</Text>{field('remark1', false, true, 500)}{field('remark2', false, true, 500)}</View>
        <View className={styles.card}><AgreementCheckbox agreed={agreed} onChange={setAgreed}>我已阅读并同意<Text onClick={event => { event.stopPropagation(); void ensureAgreementSigned('cert_registration', '认证报名信息处理授权协议', '请阅读认证报名信息处理授权协议') }}>《认证报名信息处理授权协议》</Text></AgreementCheckbox>
          {!canSubmit && <Text className={styles.error}>{batchChecking ? '正在核验批次状态…' : !identity.verified ? '请先完成本人实名认证' : registrationId ? '当前报名不在有效补正期内' : availability.message || batchCheckError}</Text>}
          {submitError && <Text className={styles.error}>{submitError}</Text>}</View>
      </>}
    </View></ScrollView>
    <RegistrationSubmitBar priceCents={batch?.price_cents ?? registration?.price_cents} priceText={registrationId ? '无需重复付款' : undefined} label={registrationId ? '提交补正' : '提交并前往付款'} disabled={!canSubmit || submitting} loading={submitting} onSubmit={() => void submit()} />
  </View></AuthGuard>
}
