import { useCallback, useEffect, useRef, useState } from 'react'
import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { Button } from '../Button'
import { ConsultationGroupCard } from '../ConsultationGroupCard'
import { useAuth } from '@/hooks/useAuth'
import { certificationJourneyService, type CertificationVendor, type EnrollmentJourney } from '@/services/certificationJourney'
import { enrollmentDeadline, enrollmentDetailUrl } from '@/utils/enrollment'
import { formatCertificationTime } from '@/utils/certificationBatch'
import styles from './index.module.scss'

export function JourneyPanel({ vendor, id }: { vendor: CertificationVendor; id: number }) {
  const { isLoggedIn, sessionId } = useAuth()
  const [journey, setJourney] = useState<EnrollmentJourney | null>(null), [error, setError] = useState(''), [open, setOpen] = useState(false)
  const generation = useRef(0), firstShow = useRef(true)
  const load = useCallback(async () => {
    if (!isLoggedIn || !id) return
    const seq = ++generation.current
    try { const next = await certificationJourneyService.journey(vendor, id); if (seq === generation.current) { setJourney(next); setError('') } }
    catch (reason) { if (seq === generation.current) setError(reason instanceof Error ? reason.message : '办理进度加载失败') }
  }, [vendor, id, isLoggedIn, sessionId])
  useEffect(() => { setJourney(null); setOpen(false); void load(); return () => { generation.current++ } }, [load])
  useDidShow(() => { if (!firstShow.current) void load(); firstShow.current = false })
  const payment = () => { if (journey) void Taro.navigateTo({ url: `/pages/order-detail/index?order_id=${journey.order_id}` }) }
  return <>
    <View className={styles.card}>
      <Text className={styles.title}>报名办理</Text>
      {error ? <><Text className={styles.error}>{error}</Text><Button variant='secondary' onClick={() => void load()}>重新加载办理进度</Button></> : !journey ? <Text className={styles.hint}>正在加载办理进度…</Text> : <>
        <Text className={styles.paragraph}>{journey.subject} · {journey.batch_name}</Text><Text className={styles.hint}>报名编号：{journey.registration_no}</Text>
        <View className={styles.stages}>{journey.stages.map((stage, index) => <View key={stage} className={`${styles.stage} ${journey.progress.stage !== null && index < journey.progress.stage ? styles.stageDone : ''} ${index === journey.progress.stage ? styles.stageCurrent : ''}`}><Text>{stage}</Text></View>)}</View>
        <Text className={journey.progress.exception ? styles.error : styles.title}>{journey.progress.label}</Text><Text className={styles.paragraph}>{journey.progress.description}</Text>
        {journey.reason && <Text className={styles.error}>处理原因：{journey.reason}</Text>}
        {journey.proof_due_at && <Text className={styles.deadline}>转账凭证提交截止：{enrollmentDeadline(journey.proof_due_at)}</Text>}
        {journey.correction_due_at && journey.progress.action === 'correct' && <Text className={styles.deadline}>补正截止：{enrollmentDeadline(journey.correction_due_at)}</Text>}
        {journey.progress.action === 'payment' && <Button variant='secondary' onClick={payment}>查看付款详情</Button>}
        {journey.progress.action === 'correct' && <>{vendor === 'sangfor' ? <Button variant='secondary' onClick={() => void Taro.navigateTo({ url: `/pages/sangfor/form?registration_id=${id}` })}>修改并提交补正</Button> : <Text className={styles.hint}>请在本页下方补正区域修改资料并提交，原已支付订单继续复用。</Text>}</>}
        <Text className={styles.link} onClick={() => void load()}>刷新办理进度</Text>
      </>}
    </View>
    {journey && <View className={styles.card}><Text className={styles.title}>办理记录</Text>{journey.events.map((item, index) => <View key={index} className={styles.event}><Text>{formatCertificationTime(item.at)}　{item.label}</Text>{item.reason && <Text className={styles.hint}>{item.reason}</Text>}</View>)}</View>}
    {journey && <View className={styles.consultation}><Button size='sm' variant='gradient' onClick={() => setOpen(true)}>报名咨询</Button></View>}
    {open && journey && <View className={styles.mask} onClick={() => setOpen(false)}><ScrollView scrollY className={styles.sheet} onClick={event => event.stopPropagation()}>
      <Text className={styles.title}>报名咨询</Text>
      {journey.contact.contact_name && <Text className={styles.paragraph}>管理员：{journey.contact.contact_name}</Text>}
      {journey.contact.contact_phone && <View className={styles.row}><Text>联系电话：{journey.contact.contact_phone}</Text><Text className={styles.link} onClick={() => void Taro.makePhoneCall({ phoneNumber: journey.contact.contact_phone }).catch(() => Taro.showToast({ title: '拨打未完成，可复制号码联系', icon: 'none' }))}>拨打</Text></View>}
      {journey.contact.contact_wechat && <View className={styles.row}><Text>联系微信：{journey.contact.contact_wechat}</Text><Text className={styles.link} onClick={() => void Taro.setClipboardData({ data: journey.contact.contact_wechat }).catch(() => Taro.showToast({ title: '复制失败，请手动记录', icon: 'none' }))}>复制</Text></View>}
      {journey.contact.service_hours && <Text className={styles.hint}>服务时间：{journey.contact.service_hours}</Text>}
      {!journey.contact.contact_phone && !journey.contact.contact_wechat && <Text className={styles.hint}>该批次暂未配置联系方式，请通过“我的 → 联系老师”咨询。</Text>}
      <Text className={styles.title}>批次咨询群</Text>{journey.consultation_group ? <ConsultationGroupCard group={journey.consultation_group} /> : <Text className={styles.hint}>{journey.group_message}</Text>}
      <Button variant='secondary' onClick={() => setOpen(false)}>关闭</Button>
    </ScrollView></View>}
  </>
}

export function OrderEnrollmentLink({ orderId }: { orderId: number }) {
  const [target, setTarget] = useState<{ vendor: CertificationVendor; id: number } | null>(null)
  const { isLoggedIn, sessionId } = useAuth()
  useEffect(() => {
    setTarget(null)
    if (!isLoggedIn || !orderId) return
    let active = true
    certificationJourneyService.order(orderId).then(value => { if (active) setTarget(value) }).catch(() => {})
    return () => { active = false }
  }, [orderId, isLoggedIn, sessionId])
  return target ? <View className={styles.card}><Button variant='secondary' onClick={() => void Taro.navigateTo({ url: enrollmentDetailUrl(target.vendor, target.id) })}>查看报名办理进度／咨询管理员</Button></View> : null
}
