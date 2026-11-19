import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { JourneyPanel } from '@/components/CertificationEnrollment/JourneyPanel'
import { RefreshableScrollView } from '@/components/RefreshableScrollView'
import { sangforService, type SangforRegistration } from '@/services/sangforService'
import { h3cService } from '@/services/h3cService'
import type { H3cExamBooking } from '@/types/h3c'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/constants/routes'
import { SANGFOR_LABELS } from '@/utils/sangforForm'
import { readRegistrationPreview, type RegistrationPreview } from '@/utils/registrationPreview'
import styles from './sangfor.module.scss'

export default function SangforDetailPage() {
  const id = Number(useRouter().params?.id), { isLoggedIn, sessionId } = useAuth()
  const [record, setRecord] = useState<SangforRegistration | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true)
  const [examBooking, setExamBooking] = useState<H3cExamBooking | null>(null)
  const [examBookingLoading, setExamBookingLoading] = useState(false)
  const [examBookingError, setExamBookingError] = useState('')
  const [preview, setPreview] = useState<RegistrationPreview | null>(() => (
    Number.isSafeInteger(id) && id > 0 ? readRegistrationPreview(`sangfor-${id}`) : null
  ))
  const generation = useRef(0)
  const firstShow = useRef(true)
  const loadExamBooking = useCallback(async () => {
    if (!Number.isSafeInteger(id) || id <= 0) return
    setExamBookingLoading(true)
    setExamBookingError('')
    try {
      const rows = await h3cService.listExamBookings('sangfor')
      setExamBooking(
        rows.find(item => item.registration_id === id && item.status === 'booked') || null,
      )
    } catch {
      // 查询失败不能等同于“从未预约”，否则会误导用户重复预约。
      setExamBookingError('预约信息加载失败')
    } finally {
      setExamBookingLoading(false)
    }
  }, [id])
  const load = useCallback(async () => {
    if (!isLoggedIn) return
    const seq = ++generation.current
    setLoading(true); setError('')
      try {
        if (!Number.isSafeInteger(id) || id <= 0) throw new Error('报名记录无效')
        const value = await sangforService.registration(id)
        if (seq === generation.current) { setRecord(value); setPreview(null) }
        // 预约状态是次要信息：异步加载，不阻塞报名详情首屏。
        void loadExamBooking()
      }
    catch (reason) { if (seq === generation.current) setError(reason instanceof Error ? reason.message : '报名详情加载失败') }
    finally { if (seq === generation.current) setLoading(false) }
  }, [id, isLoggedIn, sessionId, loadExamBooking])
  useEffect(() => { setRecord(null); void load(); return () => { generation.current++ } }, [load])
  useDidShow(() => {
    if (firstShow.current) { firstShow.current = false; return }
    void load()
  })
  return <AuthGuard><View className={styles.page}><PageHeader title='深信服报名详情' shouldShowBack />
    <RefreshableScrollView className={styles.body} onRefresh={load}><View className={styles.content}>
      {loading && <View className={styles.empty}>加载中…</View>}
      {loading && preview && <View className={styles.card}>
        <Text className={styles.title}>{preview.title}</Text>
        <View className={styles.row}><Text className={styles.label}>状态</Text><Text className={styles.value}>{preview.statusLabel}</Text></View>
        {preview.extraRows.map(row => <View key={row.label} className={styles.row}><Text className={styles.label}>{row.label}</Text><Text className={styles.value}>{row.value}</Text></View>)}
        <Text className={styles.hint}>详情加载中...</Text>
      </View>}
      {error && <View className={styles.empty} onClick={() => void load()}>{error}，点击重试</View>}
      {!loading && !error && record && <>
        <JourneyPanel vendor='sangfor' id={record.id} />
        <View className={styles.card}><Text className={styles.title}>{record.batch_snapshot.name}</Text><Text className={styles.hint}>{record.batch_snapshot.exam_direction}</Text>
          <Text className={styles.hint}>报名编号：{record.registration_no}</Text><Text className={styles.hint}>当前资料：第{record.current_version}版</Text>
          <View className={styles.actions}>
            {(record.status === 'approved' || record.status === 'final_approved') && (
              examBookingError
                ? <Button variant='secondary' onClick={() => void loadExamBooking()}>预约信息加载失败，点击重试</Button>
                : examBookingLoading && !examBooking
                  ? <Button variant='secondary' disabled>预约信息加载中…</Button>
                  : <Button variant='gradient' onClick={() => Taro.navigateTo({ url: `/${ROUTES.H3C_EXAM_BOOKING}?vendor=sangfor&registration_id=${record.id}` })}>
                    {examBooking ? `📅 ${examBooking.exam_date.slice(0, 10)} ${examBooking.slot_label}` : '预约考试日期'}
                  </Button>
            )}
          </View></View>
        <View className={styles.card}><Text className={styles.title}>报名资料</Text><View className={styles.row}><Text className={styles.label}>姓名</Text><Text>{record.candidate_snapshot.name}</Text></View>
          {Object.entries(SANGFOR_LABELS).map(([key, label]) => <View className={styles.row} key={key}><Text className={styles.label}>{label}</Text><Text className={styles.value}>{record.candidate_snapshot[key] || '—'}</Text></View>)}</View>
      </>}
    </View></RefreshableScrollView>
  </View></AuthGuard>
}
