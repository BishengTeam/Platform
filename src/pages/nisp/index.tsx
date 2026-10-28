import { navigateWithLogin } from '@/utils/loginCoordinator'
import { useEffect, useState, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { RefreshableScrollView } from '@/components/RefreshableScrollView'
import { CertBatchCard, type CertBatchInfoItem } from '@/components/CertBatchCard'
import { nispService } from '@/services/nispService'
import type { NispBatch } from '@/services/nispService'
import { ROUTES } from '@/constants/routes'
import { formatDate } from '@/utils/format'
import { formatNispApplyRange } from '@/utils/nisp'
import { useCertificationBatchClock } from '@/hooks/useCertificationBatchClock'
import { certificationBatchState } from '@/utils/certificationBatch'
import styles from './nisp.module.scss'

export default function NispIndexPage() {
  const { params } = useRouter()
  const routeLevel = params?.level
  const level = routeLevel === '1' || routeLevel === '2' ? routeLevel : undefined
  const [batches, setBatches] = useState<NispBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    return nispService.listBatches(level)
      .then(setBatches)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [level])

  useEffect(() => { load() }, [load])
  const now = useCertificationBatchClock(batches, load)
  const visibleBatches = batches.filter(batch => certificationBatchState(batch, now).visible)

  return (
    <>
      <View className={styles.page}>
        <PageHeader
          title={level === '1' ? 'NISP 一级' : level === '2' ? 'NISP 二级' : 'NISP 认证'}
          shouldShowBack
        />
        <RefreshableScrollView className={styles.body} onRefresh={load}>
          <View className={styles.sectionCard}>
            <Text className={styles.sectionTitle}>报名前准备</Text>
            <Text className={styles.materialCount}>办理报名时登录并核验本人实名。需身份证双面PDF、二寸蓝底JPG照片；二级另需学籍报告PDF及二级申请表PDF。材料大小以所选批次要求为准。</Text>
          </View>
          {loading && <View className={styles.empty}>加载中...</View>}
          {error && <View className={styles.empty} onClick={load}>加载失败，点击重试</View>}
          {!loading && !error && visibleBatches.length === 0 && (
            <View className={styles.empty}>
              {level ? '该级别批次暂未开放，敬请期待' : '暂无可报名的考试批次'}
            </View>
          )}

          {!loading && !error && visibleBatches.map((batch) => {
            const availability = certificationBatchState(batch, now)
            const infoItems: CertBatchInfoItem[] = [
              { label: '报考级别', value: batch.level === '1' ? 'NISP一级' : 'NISP二级' },
              { label: '报名时间', value: formatNispApplyRange(batch), full: true },
              ...(batch.exam_date
                ? [{ label: '考试时间', value: formatDate(batch.exam_date) }]
                : []),
              {
                label: '剩余名额',
                value: batch.remaining_count === -1 ? '不限' : `${batch.remaining_count} 人`,
              },
              ...(batch.exam_location
                ? [{ label: '考试地点', value: batch.exam_location, full: true }]
                : []),
              {
                label: batch.level === '1' ? '一级报名费' : '二级报名费',
                value: `¥${((batch.level === '1'
                  ? batch.level1_price_cents
                  : batch.level2_price_cents) / 100).toFixed(2)}`,
                full: true,
              },
            ]

            return (
              <CertBatchCard
                key={batch.id}
                title={batch.name}
                badge={availability.label}
                badgeTone={availability.tone}
                infoItems={infoItems}
                actionText={availability.action}
                actionDisabled={!availability.canApply}
                onAction={() => {
                  const current = certificationBatchState(batch)
                  if (!current.canApply) { Taro.showToast({ title: current.message, icon: 'none' }); void load(); return }
                  void navigateWithLogin(`/${ROUTES.NISP_FORM}?batch_id=${batch.id}&level=${batch.level}`)
                }}
              />
            )
          })}

          <View className={styles.secondaryAction}>
            <Button
              variant='secondary'
              onClick={() => void navigateWithLogin(`/${ROUTES.MINE_REGISTRATIONS}`)}
            >
              我的报名
            </Button>
          </View>
        </RefreshableScrollView>
      </View>
    </>
  )
}
