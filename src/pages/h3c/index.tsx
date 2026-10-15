import { useCallback, useMemo, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useLoad, usePullDownRefresh, useRouter } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { RefreshableScrollView } from '@/components/RefreshableScrollView'
import { CertBatchCard, type CertBatchInfoItem } from '@/components/CertBatchCard'
import { h3cService } from '@/services/h3cService'
import { ROUTES } from '@/constants/routes'
import { formatDate } from '@/utils/format'
import type { H3cExamBatch, H3cRegistrationType } from '@/types/h3c'
import styles from './h3c.module.scss'

const BATCH_STATUS_META: Record<string, {
  label: string
  buttonLabel: string
  tone: 'green' | 'orange' | 'gray'
}> = {
  published: { label: '报名中', buttonLabel: '立即报名', tone: 'green' },
  registration_closed: { label: '已截止', buttonLabel: '报名已结束', tone: 'orange' },
  finalized: { label: '已结束', buttonLabel: '报名已结束', tone: 'gray' },
}

const PRICE_LABELS: Partial<Record<H3cRegistrationType, string>> = {
  student: '学生价',
  coupon: '考券价',
  full: '全额价',
}

const getStatusMeta = (status: string) => BATCH_STATUS_META[status] ?? {
  label: status,
  buttonLabel: '暂不可报名',
  tone: 'gray' as const,
}

export default function H3CListPage() {
  const { params } = useRouter()
  const certCode = params?.cert_code ? decodeURIComponent(params.cert_code) : ''
  const productName = params?.product_name ? decodeURIComponent(params.product_name) : ''
  const [batches, setBatches] = useState<H3cExamBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    return h3cService.listBatches()
      .then(setBatches)
      .catch(() => {
        setBatches([])
        setError(true)
      })
      .finally(() => setLoading(false))
  }, [])

  useLoad(() => { void load() })
  usePullDownRefresh(async () => {
    await load()
    Taro.stopPullDownRefresh()
  })

  const visibleBatches = useMemo(() => (
    certCode
      ? batches.filter(batch => batch.certification_code === certCode)
      : batches
  ), [batches, certCode])

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={productName || 'H3C 认证'} shouldShowBack />
        <RefreshableScrollView className={styles.body} onRefresh={load}>
          {loading && <View className={styles.empty}>正在加载考试批次...</View>}
          {error && (
            <View className={styles.empty} onClick={() => { void load() }}>
              <Text>加载失败，点击重试</Text>
            </View>
          )}
          {!loading && !error && visibleBatches.length === 0 && (
            <View className={styles.empty}>
              <Text>{certCode ? '该产品暂无开放批次' : '暂无可报名的考试批次'}</Text>
            </View>
          )}

          {!loading && !error && visibleBatches.map((batch) => {
            const statusMeta = getStatusMeta(batch.status)
            const canRegister = batch.status === 'published'
            const infoItems: CertBatchInfoItem[] = [
              {
                label: '报名时间',
                value: `${formatDate(batch.apply_start)} ~ ${formatDate(batch.apply_end)}`,
                full: true,
              },
              { label: '考试时间', value: formatDate(batch.exam_date, '待公布') },
              {
                label: '剩余名额',
                value: batch.remaining_count === -1 ? '不限' : `${batch.remaining_count} 人`,
              },
              ...(batch.exam_location
                ? [{ label: '考试地点', value: batch.exam_location, full: true }]
                : []),
              ...batch.prices.map(price => ({
                label: PRICE_LABELS[price.registration_type] ?? '报名费',
                value: `¥${(price.price_cents / 100).toFixed(2)}`,
                full: true,
              })),
            ]

            return (
              <CertBatchCard
                key={batch.id}
                title={batch.name}
                badge={statusMeta.label}
                badgeTone={statusMeta.tone}
                infoItems={infoItems}
                actionText={statusMeta.buttonLabel}
                actionDisabled={!canRegister}
                onAction={() => Taro.navigateTo({
                  url: `/${ROUTES.H3C_FORM}?batch_id=${batch.id}`,
                })}
              />
            )
          })}

          <View className={styles.secondaryAction}>
            <Button
              variant='secondary'
              onClick={() => Taro.navigateTo({ url: `/${ROUTES.MINE_REGISTRATIONS}` })}
            >
              我的报名
            </Button>
          </View>
        </RefreshableScrollView>
      </View>
    </AuthGuard>
  )
}
