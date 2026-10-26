import { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { FormInput } from '@/components/FormInput'
import { Button } from '@/components/Button'
import { AgreementCheckbox } from '@/components/AgreementCheckbox'
import { RegistrationSubmitBar, RegistrationSummary } from '@/components/RegistrationParts'
import { useAuth } from '@/hooks/useAuth'
import { getUserProfile } from '@/services/userService'
import { sangforService, type SangforBatch, type SangforRegistration, type SangforValues } from '@/services/sangforService'
import { SANGFOR_LABELS, validateSangforForm, canApplySangfor } from '@/utils/sangforForm'
import { ensureAgreementSigned } from '@/utils/agreementGate'
import { ROUTES } from '@/constants/routes'
import { formatDateTime } from '@/utils/format'
import styles from './sangfor.module.scss'

const INITIAL: SangforValues = { phone: '', organization: '', first_name: '', last_name: '', exam_voucher_code: '', email: '', mailing_address: '', remark1: '', remark2: '' }

export default function SangforFormPage() {
  const { isLoggedIn, sessionId } = useAuth()
  const [batchId, setBatchId] = useState(0), [registrationId, setRegistrationId] = useState(0), [routeReady, setRouteReady] = useState(false)
  const [batch, setBatch] = useState<SangforBatch | null>(null), [registration, setRegistration] = useState<SangforRegistration | null>(null)
  const [form, setForm] = useState<SangforValues>(INITIAL), [identity, setIdentity] = useState({ name: '', id: '', verified: false })
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(''), [retry, setRetry] = useState(0)
  const [errors, setErrors] = useState<Partial<Record<keyof SangforValues, string>>>({}), [submitError, setSubmitError] = useState('')
  const [agreed, setAgreed] = useState(false), [submitting, setSubmitting] = useState(false), [scrollTarget, setScrollTarget] = useState('')
  const lock = useRef(false)
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
        setForm(old => ({ ...old, phone: old.phone || profile.profile.phone || '', email: old.email || profile.profile.email || '',
          organization: old.organization || profile.enterprise?.organization || '', first_name: old.first_name || realname?.first_name_en || '', last_name: old.last_name || realname?.last_name_en || '' }))
      }
    }
    void load().catch(reason => { if (active) setLoadError(reason instanceof Error ? reason.message : '报名信息加载失败') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [isLoggedIn, sessionId, routeReady, batchId, registrationId, retry])
  const correctionAllowed = !!registration && registration.status === 'returned' && !!registration.correction_due_at && Date.parse(registration.correction_due_at) >= Date.now()
  const canSubmit = identity.verified && !loading && !loadError && (registrationId ? correctionAllowed : !!batch && canApplySangfor(batch))
  const submit = async () => {
    if (lock.current || !canSubmit) return
    const next = validateSangforForm(form)
    setErrors(next); setSubmitError('')
    const first = Object.keys(next)[0]
    if (first) { setScrollTarget(''); Taro.nextTick(() => setScrollTarget(`sangfor-${first}`)); return }
    if (!agreed) { setSubmitError('请先阅读并同意认证报名信息处理授权协议'); return }
    lock.current = true; setSubmitting(true)
    try {
      if (!(await ensureAgreementSigned('cert_registration', '认证报名信息处理授权协议', '提交报名前请阅读并同意认证报名信息处理授权协议'))) return
      const values = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()])) as unknown as SangforValues
      if (registration) {
        const result = await sangforService.resubmit(registration.id, registration.revision, values)
        await Taro.redirectTo({ url: `/${ROUTES.SANGFOR_DETAIL}?id=${result.id}` })
      } else if (batch) {
        const result = await sangforService.create(batch.id, values)
        await Taro.redirectTo({ url: `/${ROUTES.REGISTRATION_CONFIRM}?order_id=${result.order_id}` })
      }
    } catch (reason) { setSubmitError(reason instanceof Error ? reason.message : '提交失败，请重试') }
    finally { lock.current = false; setSubmitting(false) }
  }
  const field = (key: keyof SangforValues, required = false, wide = false, maxLength = 128) => <View key={key} id={`sangfor-${key}`} className={wide ? styles.wide : undefined}>
    <FormInput compact label={SANGFOR_LABELS[key]} required={required} value={form[key]} placeholder={`请填写${SANGFOR_LABELS[key]}`} maxlength={maxLength} disabled={submitting}
      onChange={value => { setForm(old => ({ ...old, [key]: value })); setErrors(old => ({ ...old, [key]: undefined })) }} error={errors[key] ? { valid: false, message: errors[key]! } : undefined} />
  </View>
  const summary = registration?.batch_snapshot
  return <AuthGuard><View className={styles.page}><PageHeader title={registrationId ? '深信服报名补正' : '深信服认证报名'} shouldShowBack />
    <ScrollView className={styles.body} scrollY scrollIntoView={scrollTarget} scrollWithAnimation><View className={styles.content}>
      {loading && <View className={styles.empty}>加载中…</View>}
      {loadError && <View className={styles.card}><Text className={styles.error}>{loadError}</Text><Button variant='secondary' onClick={() => setRetry(value => value + 1)}>重新加载</Button></View>}
      {!loading && !loadError && <>
        <RegistrationSummary title={batch?.name || summary?.name || '深信服报名'} badge='深信服' subtitle={batch?.exam_direction || summary?.exam_direction} priceCents={batch?.price_cents ?? registration?.price_cents}
          items={[{ label: '考试时间', value: (batch?.exam_date || summary?.exam_date) ? formatDateTime(batch?.exam_date || summary?.exam_date || '') : '以通知为准', wide: true }, { label: '考试地点', value: batch?.exam_location || summary?.exam_location || '以通知为准', wide: true }]} />
        <View className={styles.card}><Text className={styles.title}>本人身份</Text><View className={styles.row}><Text className={styles.label}>姓名</Text><Text className={styles.value}>{identity.name || '未实名'}</Text></View>
          <View className={styles.row}><Text className={styles.label}>身份证号</Text><Text className={styles.value}>{identity.id ? `${identity.id.slice(0, 3)}***********${identity.id.slice(-4)}` : '未实名'}</Text></View>
          {!identity.verified && <Button variant='secondary' onClick={() => Taro.navigateTo({ url: '/pages/mine/edit-profile' })}>完成本人实名认证</Button>}</View>
        {registration && <View className={styles.card}><Text className={styles.title}>补正要求</Text><Text className={styles.hint}>{registration.reviews.slice(-1)[0]?.reason}</Text><Text className={styles.hint}>截止时间：{registration.correction_due_at ? formatDateTime(registration.correction_due_at) : '未设置'}。已付款报名补正无需重复付款。</Text></View>}
        <View className={styles.card}><Text className={styles.title}>报考信息</Text><Text className={styles.hint}>firstName填写名字拼音，lastName填写姓氏拼音。考试券码由考生提供，管理员核验后报送。</Text>
          <View className={styles.fields}>{field('first_name', true, false, 64)}{field('last_name', true, false, 64)}{field('organization', true, true)}{field('exam_voucher_code', true, true)}</View></View>
        <View className={styles.card}><Text className={styles.title}>联系信息</Text><View className={styles.fields}>{field('phone', true, false, 11)}{field('email')}{field('mailing_address', false, true, 256)}</View></View>
        <View className={styles.card}><Text className={styles.title}>补充说明</Text>{field('remark1', false, true, 500)}{field('remark2', false, true, 500)}</View>
        <View className={styles.card}><AgreementCheckbox agreed={agreed} onChange={setAgreed}>我已阅读并同意<Text onClick={() => void ensureAgreementSigned('cert_registration', '认证报名信息处理授权协议', '请阅读认证报名信息处理授权协议')}>《认证报名信息处理授权协议》</Text></AgreementCheckbox>
          {!canSubmit && <Text className={styles.error}>{!identity.verified ? '请先完成本人实名认证' : registrationId ? '当前报名不在有效补正期内' : '该批次当前不可报名，请返回列表重新选择'}</Text>}
          {submitError && <Text className={styles.error}>{submitError}</Text>}</View>
      </>}
    </View></ScrollView>
    <RegistrationSubmitBar priceCents={batch?.price_cents ?? registration?.price_cents} priceText={registrationId ? '无需重复付款' : undefined} label={registrationId ? '提交补正' : '提交并前往付款'} disabled={!canSubmit || submitting} loading={submitting} onSubmit={() => void submit()} />
  </View></AuthGuard>
}
