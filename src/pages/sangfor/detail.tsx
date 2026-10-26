import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { RefreshableScrollView } from '@/components/RefreshableScrollView'
import { sangforService, type SangforRegistration } from '@/services/sangforService'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/constants/routes'
import { SANGFOR_LABELS, SANGFOR_STATUS } from '@/utils/sangforForm'
import { formatDateTime } from '@/utils/format'
import styles from './sangfor.module.scss'

export default function SangforDetailPage() {
  const id = Number(useRouter().params?.id), { isLoggedIn, sessionId } = useAuth()
  const [record, setRecord] = useState<SangforRegistration | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true)
  const generation = useRef(0)
  const load = useCallback(async () => {
    if (!isLoggedIn) return
    const seq = ++generation.current
    setLoading(true); setError('')
    try { if (!Number.isSafeInteger(id) || id <= 0) throw new Error('报名记录无效'); const value = await sangforService.registration(id); if (seq === generation.current) setRecord(value) }
    catch (reason) { if (seq === generation.current) setError(reason instanceof Error ? reason.message : '报名详情加载失败') }
    finally { if (seq === generation.current) setLoading(false) }
  }, [id, isLoggedIn, sessionId])
  useEffect(() => { setRecord(null); void load(); return () => { generation.current++ } }, [load])
  useDidShow(() => { void load() })
  return <AuthGuard><View className={styles.page}><PageHeader title='深信服报名详情' shouldShowBack />
    <RefreshableScrollView className={styles.body} onRefresh={load}><View className={styles.content}>
      {loading && <View className={styles.empty}>加载中…</View>}
      {error && <View className={styles.empty} onClick={() => void load()}>{error}，点击重试</View>}
      {!loading && !error && record && <>
        <View className={styles.card}><Text className={styles.title}>{record.batch_snapshot.name}</Text><Text className={styles.hint}>{record.batch_snapshot.exam_direction}</Text>
          <View className={styles.row}><Text className={styles.label}>报名状态</Text><Text className={styles.value}>{SANGFOR_STATUS[record.status] || record.status}</Text></View>
          <Text className={styles.hint}>报名编号：{record.registration_no}</Text><Text className={styles.hint}>当前资料：第{record.current_version}版</Text>
          <View className={styles.actions}><Button variant='secondary' onClick={() => Taro.navigateTo({ url: `/${ROUTES.ORDER_DETAIL}?order_id=${record.order_id}` })}>查看订单／付款进度</Button>
            {record.status === 'returned' && record.correction_due_at && Date.parse(record.correction_due_at) >= Date.now() && <Button variant='gradient' onClick={() => Taro.navigateTo({ url: `/${ROUTES.SANGFOR_FORM}?registration_id=${record.id}` })}>修改并提交补正</Button>}</View></View>
        <View className={styles.card}><Text className={styles.title}>报名资料</Text><View className={styles.row}><Text className={styles.label}>姓名</Text><Text>{record.candidate_snapshot.name}</Text></View>
          {Object.entries(SANGFOR_LABELS).map(([key, label]) => <View className={styles.row} key={key}><Text className={styles.label}>{label}</Text><Text className={styles.value}>{record.candidate_snapshot[key] || '—'}</Text></View>)}</View>
        <View className={styles.card}><Text className={styles.title}>审核记录</Text>{!record.reviews.length && <Text className={styles.hint}>核账确认后进入报名审核。</Text>}
          {record.reviews.map((item, index) => <View key={index}><Text className={styles.hint}>第{item.version}版 · {formatDateTime(item.created_at)}</Text><Text className={styles.hint}>{({ approve: '初审通过', return: '退回补正', final_approve: '外审通过', final_return: '外审退回' })[item.action] || item.action}：{item.reason || '已核验'}</Text>
            {item.correction_due_at && <Text className={styles.error}>补正截止：{formatDateTime(item.correction_due_at)}</Text>}</View>)}</View>
      </>}
    </View></RefreshableScrollView>
  </View></AuthGuard>
}
