import { useCallback, useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { PageHeader } from '@/components/PageHeader'
import { RefreshableScrollView } from '@/components/RefreshableScrollView'
import { CertBatchCard } from '@/components/CertBatchCard'
import { Button } from '@/components/Button'
import { sangforService, type SangforBatch } from '@/services/sangforService'
import { ROUTES } from '@/constants/routes'
import { navigateWithLogin } from '@/utils/loginCoordinator'
import { formatDateTime } from '@/utils/format'
import { useCertificationBatchClock } from '@/hooks/useCertificationBatchClock'
import { certificationBatchState, formatCertificationApplyRange } from '@/utils/certificationBatch'
import styles from './sangfor.module.scss'

export default function SangforIndexPage() {
  const code = useRouter().params?.cert_code
  const [rows, setRows] = useState<SangforBatch[]>([])
  const [loading, setLoading] = useState(true), [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setRows(await sangforService.listBatches(code)) }
    catch (reason) { setError(reason instanceof Error ? reason.message : '批次加载失败，请重试') }
    finally { setLoading(false) }
  }, [code])
  useEffect(() => { void load() }, [load])
  const now = useCertificationBatchClock(rows, load)
  const visibleRows = rows.filter(batch => certificationBatchState({ ...batch, can_apply: !!batch.exam_date }, now).visible)
  return <View className={styles.page}><PageHeader title='深信服认证' shouldShowBack />
    <RefreshableScrollView className={styles.body} onRefresh={load}>
      <View className={styles.content}>
        <View className={styles.card}><Text className={styles.title}>报名前准备</Text><Text className={styles.hint}>办理时登录并核验本人实名，准备名字及姓氏拼音、所属机构和有效考试券码。考试时间、方向和费用以所选批次为准。</Text></View>
        {loading && <View className={styles.empty}>加载中…</View>}
        {error && <View className={styles.empty} onClick={() => void load()}>{error}，点击重试</View>}
        {!loading && !error && !visibleRows.length && <View className={styles.empty}>暂无已开放的考试批次</View>}
        {!loading && !error && visibleRows.map(batch => {
          const availability = certificationBatchState({ ...batch, can_apply: !!batch.exam_date }, now)
          return <CertBatchCard key={batch.id} title={batch.name} badge={availability.label} badgeTone={availability.tone}
          infoItems={[
            { label: '报考方向', value: batch.exam_direction, full: true },
            { label: '报名时间', value: formatCertificationApplyRange(batch), full: true },
            { label: '考试时间', value: batch.exam_date ? formatDateTime(batch.exam_date) : '待定', full: true },
            { label: '考试地点', value: batch.exam_location || '以通知为准', full: true },
            { label: '剩余名额', value: batch.remaining_count < 0 ? '不限' : `${batch.remaining_count}人` },
            { label: '报名费', value: `¥${(batch.price_cents / 100).toFixed(2)}` },
            ...(batch.description ? [{ label: '报名说明', value: batch.description, full: true }] : []),
          ]} actionText={availability.action} actionDisabled={!availability.canApply} onAction={() => {
            const current = certificationBatchState({ ...batch, can_apply: !!batch.exam_date })
            if (current.canApply) void navigateWithLogin(`/${ROUTES.SANGFOR_FORM}?batch_id=${batch.id}`)
            else { Taro.showToast({ title: current.message, icon: 'none' }); void load() }
          }} />})}
        <Button variant='secondary' onClick={() => void navigateWithLogin(`/${ROUTES.MINE_REGISTRATIONS}`)}>我的报名</Button>
      </View>
    </RefreshableScrollView>
  </View>
}
