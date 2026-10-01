import { useCallback, useState } from 'react'
import { ScrollView, View, Text } from '@tarojs/components'
import Taro, { usePullDownRefresh, useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { h3cService } from '@/services/h3cService'
import { ROUTES } from '@/constants/routes'
import type { H3cExamBatch, H3cRegistrationType } from '@/types/h3c'
import styles from './h3c.module.scss'

const CARD_PRICE_OPTIONS: Array<{ type: H3cRegistrationType; label: string }> = [
  { type: 'student', label: '学生价' },
  { type: 'coupon', label: '考券价' },
]

const formatExamDate = (value: string) => value.slice(0, 16).replace('T', ' ')

const formatPrice = (batch: H3cExamBatch, type: H3cRegistrationType) => {
  const price = batch.prices.find((item) => item.registration_type === type)?.price_cents
  return price === undefined ? '¥--' : `¥${(price / 100).toFixed(2)}`
}

export default function H3CListPage() {
  const [batches, setBatches] = useState<H3cExamBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    h3cService.listBatches()
      .then(setBatches)
      .catch(() => {
        setBatches([])
        setError(true)
      })
      .finally(() => setLoading(false))
  }, [])

  useLoad(() => load())
  usePullDownRefresh(() => {
    load()
    Taro.stopPullDownRefresh()
  })

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='H3C 认证报名' shouldShowBack />
        <View className={styles.body}>
          <Button variant='secondary' size='lg' onClick={() => Taro.navigateTo({ url: `/${ROUTES.MINE_REGISTRATIONS}` })}>
            我的报名
          </Button>
          {loading && <View className={styles.empty}>正在加载考试批次...</View>}
          {error && (
            <View className={styles.empty} onClick={load}>
              <Text>加载失败，点击重试</Text>
            </View>
          )}
          {!loading && !error && batches.length === 0 && (
            <View className={styles.empty}>
              <Text>暂无可报名考试</Text>
              <Text style={{ fontSize: '24rpx', color: '#999', marginTop: '12rpx' }}>请联系老师发布考试批次</Text>
            </View>
          )}
          {batches.map((batch) => (
            <View key={batch.id} className={styles.examCard}>
              <View className={styles.examCardHeader}>
                <Text className={styles.examTitle}>{batch.name}</Text>
                <Text className={styles.vendorBadge}>H3C 官方</Text>
              </View>

              <View className={styles.examInfoList}>
                <View className={styles.infoRow}>
                  <Text className={styles.infoIcon}>🕒</Text>
                  <Text className={styles.infoLabel}>考试时间</Text>
                  <Text className={styles.infoValue}>{formatExamDate(batch.exam_date)}</Text>
                </View>
                <View className={styles.infoRow}>
                  <Text className={styles.infoIcon}>👥</Text>
                  <Text className={styles.infoLabel}>剩余名额</Text>
                  <Text className={styles.quotaValue}>仅剩 {batch.remaining_count} 名</Text>
                </View>
              </View>

              <View className={styles.divider} />

              <View className={styles.examCardFooter}>
                <View className={styles.priceGroup}>
                  {CARD_PRICE_OPTIONS.map(({ type, label }) => (
                    <View key={type} className={styles.priceItem}>
                      <Text className={styles.priceLabel}>{label}</Text>
                      <Text className={styles.priceValue}>
                        {formatPrice(batch, type)}
                      </Text>
                    </View>
                  ))}
                </View>
                <Button
                  variant='primary'
                  color='#165DFF'
                  className={styles.actionButton}
                  onClick={() => Taro.navigateTo({ url: `/${ROUTES.H3C_FORM}?batch_id=${batch.id}` })}
                >
                  立即报名
                </Button>
              </View>
            </View>
          ))}
        </View>
      </View>
    </AuthGuard>
  )
}
