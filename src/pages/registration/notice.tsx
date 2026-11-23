import { useCallback, useEffect, useRef, useState } from 'react'
import { Checkbox, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { SelectSheet } from '@/components/SelectSheet'
import { NoticeDetail } from '@/components/CertificationEnrollment/NoticeDetail'
import { certificationJourneyService, type CertificationVendor, type EnrollmentCatalog, type EnrollmentNotice } from '@/services/certificationJourney'
import { VENDOR_KEYS, currentNotice, enrollmentBatchLabel, enrollmentCountdown, enrollmentFormUrl, rememberNotice } from '@/utils/enrollment'
import { certificationBatchState } from '@/utils/certificationBatch'
import { navigateWithLogin, requireLogin } from '@/utils/loginCoordinator'
import { safeNavigateBack } from '@/utils/navigation'
import { useCertificationBatchClock } from '@/hooks/useCertificationBatchClock'
import styles from '@/components/CertificationEnrollment/index.module.scss'

export default function EnrollmentNoticePage() {
  const [vendor, setVendor] = useState<CertificationVendor | null>(null), [editing, setEditing] = useState(false)
  const [catalog, setCatalog] = useState<EnrollmentCatalog | null>(null), [subjectId, setSubject] = useState(''), [batchId, setBatch] = useState(0), [type, setType] = useState('')
  const [notice, setNotice] = useState<EnrollmentNotice | null>(null), [agreedHash, setAgreedHash] = useState('')
  const [error, setError] = useState(''), [loading, setLoading] = useState(false), [busy, setBusy] = useState(false)
  // 原生 <picker> 的弹层由客户端绘制：PC 微信会把它画在窗口正中、不跟随触发元素，
  // 双栏视图下还会压到另一栏，因此这里改用自绘弹层。
  const [sheet, setSheet] = useState<'' | 'subject' | 'batch' | 'type'>('')
  const generation = useRef(0), noticeGeneration = useRef(0), operation = useRef(false)
  const initialBatch = useRef(0), initialProject = useRef(0)
  useLoad(options => {
    const selectedVendor = VENDOR_KEYS[options?.type || ''] || null
    if (!selectedVendor) setError('认证类型无效，请返回认证专区重新选择')
    setVendor(selectedVendor); setEditing(options?.editing === '1')
    initialBatch.current = Number(options?.batch_id || 0)
    initialProject.current = Number(options?.batch_project_id || 0)
    if (selectedVendor) {
      const selected = currentNotice(selectedVendor, initialBatch.current, undefined, initialProject.current || undefined)
      if (selected) { setSubject(selected.subject.id); setBatch(selected.batch.id); setType(options?.registration_type || selected.price.value) }
    }
  })
  const load = useCallback(async () => {
    if (!vendor) return
    const seq = ++generation.current; setLoading(true); setError('')
    try {
      const value = await certificationJourneyService.catalog(vendor)
      if (seq !== generation.current) return
      setCatalog(value)
      // 函数式 updater 延迟到渲染期执行，必须先把 ref 读进局部变量，
      // 否则紧随其后的 ref 清零会让深链批次永远选不中科目。
      const targetBatchId = initialBatch.current
      const targetProjectId = initialProject.current
      const matched = value.batches.find(item => item.id === targetBatchId && (!targetProjectId || item.batch_project_id === targetProjectId))
      const nextSubject = matched?.subject_id
        || (value.subjects.length === 1 ? value.subjects[0].id : '')
      setSubject(old => value.subjects.some(item => item.id === old) ? old : nextSubject)
      if (targetBatchId) {
        setBatch(targetBatchId)
        initialBatch.current = 0
        initialProject.current = 0
      }
    } catch (reason) { if (seq === generation.current) { setCatalog(null); setError(reason instanceof Error ? reason.message : '科目与批次加载失败') } }
    finally { if (seq === generation.current) setLoading(false) }
  }, [vendor])
  useEffect(() => { void load(); return () => { generation.current++ } }, [load])
  const now = useCertificationBatchClock(catalog?.batches || [], load)
  const [countdownNow, setCountdownNow] = useState(Date.now)
  useEffect(() => { const timer = setInterval(() => setCountdownNow(Date.now()), 60000); return () => clearInterval(timer) }, [])
  const batches = (catalog?.batches || []).filter(batch => batch.subject_id === subjectId && certificationBatchState(batch, now).canApply)
  const batch = batches.find(item => item.id === batchId)
  const batchKey = batches.map(item => item.id).join(',')
  useEffect(() => { setBatch(old => batches.some(item => item.id === old) ? old : batches.length === 1 ? batches[0].id : 0) }, [subjectId, batchKey])
  useEffect(() => { setType(old => batch?.prices.some(item => item.value === old) ? old : batch?.prices.length === 1 ? batch.prices[0].value : '') }, [batchId, JSON.stringify(batch?.prices)])
  const fetchNotice = useCallback(async () => {
    const seq = ++noticeGeneration.current
    setNotice(null); setAgreedHash('')
    if (!vendor || !batch || !type) return
    setError(''); setLoading(true)
    try { const value = await certificationJourneyService.notice(vendor, batch.id, type, batch.batch_project_id); if (seq === noticeGeneration.current) setNotice(value) }
    catch (reason) { if (seq === noticeGeneration.current) setError(reason instanceof Error ? reason.message : '须知加载失败') }
    finally { if (seq === noticeGeneration.current) setLoading(false) }
  }, [vendor, batchId, type, batch?.batch_project_id, JSON.stringify(batch)])
  useEffect(() => { void fetchNotice(); return () => { noticeGeneration.current++ } }, [fetchNotice])
  const proceed = async () => {
    if (!vendor || !notice || !batch || !type || agreedHash !== notice.notice_hash || operation.current) return
    operation.current = true; setBusy(true); setError('')
    try {
      const latest = await certificationJourneyService.notice(vendor, batch.id, type, batch.batch_project_id)
      if (latest.notice_hash !== notice.notice_hash) { setNotice(latest); setAgreedHash(''); setError('须知、费用或批次要求已更新，请重新阅读并确认'); return }
      rememberNotice(latest)
      const target = enrollmentFormUrl(vendor, batch, type)
      const pages = Taro.getCurrentPages(), previous = pages[pages.length - 2] as { route?: string; options?: Record<string, string> } | undefined
      const same = previous?.route === `pages/${vendor}/form` && Number(previous.options?.[vendor === 'renshe' ? 'plan_id' : 'batch_id']) === batch.id
        && (vendor !== 'renshe' || Number(previous.options?.batch_project_id || 0) === (batch.batch_project_id || 0))
        && (vendor !== 'h3c' || (previous.options?.registration_type || 'full') === type)
      if (editing && same) await safeNavigateBack({ fallbackUrl: target })
      else if (editing && previous?.route === `pages/${vendor}/form`) {
        if (await requireLogin(target) && await safeNavigateBack({ fallbackUrl: target }) === 'back') await Taro.redirectTo({ url: target })
      }
      else await navigateWithLogin(target)
    } catch (reason) { setError(reason instanceof Error ? reason.message : '批次状态核对失败，请重试') }
    finally { operation.current = false; setBusy(false) }
  }
  const subjectDisabled = busy || !catalog?.subjects.length
  const batchDisabled = busy || !batches.length
  return <View className={styles.page}><PageHeader title='报名须知' shouldShowBack />
    <View className={styles.body}>
      <View className={styles.card}>
        <View className={styles.field}><Text className={styles.label}>报考科目</Text>
          <View className={styles.picker} aria-role='button' aria-label='选择报考科目' onClick={() => { if (!subjectDisabled) setSheet('subject') }}>{catalog?.subjects.find(item => item.id === subjectId)?.name || '请选择科目'} ▾</View></View>
        <View className={styles.field}><Text className={styles.label}>报名批次</Text>
          <View className={styles.picker} aria-role='button' aria-label='选择报名批次' onClick={() => { if (!batchDisabled) setSheet('batch') }}>{batch ? enrollmentBatchLabel(batch) : subjectId ? batches.length ? '请选择批次' : '该科目暂无可报名批次' : '请先选择科目'} ▾</View></View>
        {vendor === 'h3c' && batch && <View className={styles.field}><Text className={styles.label}>报名方式</Text>
          <View className={styles.picker} aria-role='button' aria-label='选择报名方式' onClick={() => { if (!busy) setSheet('type') }}>{batch.prices.find(item => item.value === type)?.label || '请选择考券／学生／全额报名方式'} ▾</View></View>}
        {batch?.skill_level && <Text className={styles.hint}>{batch.skill_level} · {batch.application_type}</Text>}
      </View>
      {loading && <Text className={styles.hint}>正在加载…</Text>}
      {error && <View className={styles.card}><Text className={styles.error}>{error}</Text><Button variant='secondary' onClick={() => { void load(); void fetchNotice() }}>重新加载</Button></View>}
      {notice && vendor && <><NoticeDetail vendor={vendor} notice={notice} countdown={enrollmentCountdown(notice.batch.apply_end, Math.max(now, countdownNow))} /><View className={styles.card}>
        <View className={styles.agreement} onClick={() => { if (!busy) setAgreedHash(old => old === notice.notice_hash ? '' : notice.notice_hash) }}><Checkbox value='notice' checked={agreedHash === notice.notice_hash} disabled={busy} /><Text>我已阅读并了解本次报名须知</Text></View>
        <Text className={styles.hint}>继续后填写报名信息；报名授权协议将在填写页单独确认。</Text>
      </View></>}
    </View>
    <View className={styles.sticky}><Button variant='gradient' loading={busy} disabled={!notice || !batch || loading || busy || agreedHash !== notice.notice_hash} onClick={() => void proceed()}>继续填写报名信息</Button></View>
    <SelectSheet visible={sheet === 'subject'} title='报考科目' value={subjectId} onClose={() => setSheet('')}
      options={(catalog?.subjects || []).map(item => ({ value: item.id, label: item.name }))}
      onSelect={value => { setSubject(value); setBatch(0); setType(''); setNotice(null); setAgreedHash('') }} />
    <SelectSheet visible={sheet === 'batch'} title='报名批次' value={batchId ? String(batchId) : ''} onClose={() => setSheet('')}
      options={batches.map(item => ({ value: String(item.id), label: enrollmentBatchLabel(item) }))}
      emptyText='该科目暂无可报名批次'
      onSelect={value => { setBatch(Number(value)); setType(''); setNotice(null); setAgreedHash('') }} />
    <SelectSheet visible={sheet === 'type'} title='报名方式' value={type} onClose={() => setSheet('')}
      options={batch ? batch.prices.map(item => ({ value: item.value, label: item.label })) : []}
      onSelect={value => { setType(value); setNotice(null); setAgreedHash('') }} />
  </View>
}
