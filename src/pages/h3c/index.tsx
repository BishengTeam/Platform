import { navigateWithLogin } from '@/utils/loginCoordinator'
import { useCallback, useMemo, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useLoad, usePullDownRefresh, useRouter } from '@tarojs/taro'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { RefreshableScrollView } from '@/components/RefreshableScrollView'
import { CertBatchCard, type CertBatchInfoItem } from '@/components/CertBatchCard'
import { h3cService } from '@/services/h3cService'
import { ROUTES } from '@/constants/routes'
import { formatDate } from '@/utils/format'
import type { H3cExamBatch, H3cRegistrationType } from '@/types/h3c'
import { useCertificationBatchClock } from '@/hooks/useCertificationBatchClock'
import { certificationBatchState, formatCertificationApplyRange } from '@/utils/certificationBatch'
import styles from './h3c.module.scss'

const PRICE_LABELS: Partial<Record<H3cRegistrationType, string>> = {
  student: '学生价',
  coupon: '考券价',
  full: '全额价',
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
  const now = useCertificationBatchClock(batches, load)
  usePullDownRefresh(async () => {
    await load()
    Taro.stopPullDownRefresh()
  })

  const visibleBatches = useMemo(() => (
    batches.filter(batch => (!certCode || batch.certification_code === certCode) && certificationBatchState(batch, now).visible)
  ), [batches, certCode, now])

  return (
    <>
      <View className={styles.page}>
        <PageHeader title={productName || 'H3C 认证'} shouldShowBack />
        <RefreshableScrollView className={styles.body} onRefresh={load}>
          <View className={styles.card}>
            <Text className={styles.title}>报名前准备</Text>
            <Text className={styles.remark}>可先浏览批次和费用，办理报名时登录并核验本人实名。学历可选本科、中职、高职、硕士、博士。</Text>
            <Text className={styles.remark}>学生报名：有学信网验证码时提供验证码及身份证人像面；无验证码时提供学院盖章的学籍证图片。考券报名需考券号和证明图片，全额报名无需这两类证明。</Text>
          </View>
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
            const statusMeta = certificationBatchState(batch, now)
            const canRegister = statusMeta.canApply
            const infoItems: CertBatchInfoItem[] = [
              {
                label: '报名时间',
                value: formatCertificationApplyRange(batch),
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
                actionText={statusMeta.action}
                actionDisabled={!canRegister}
                onAction={() => {
                  const current = certificationBatchState(batch)
                  if (!current.canApply) { Taro.showToast({ title: current.message, icon: 'none' }); void load(); return }
                  void navigateWithLogin(`/${ROUTES.H3C_FORM}?batch_id=${batch.id}`)
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
