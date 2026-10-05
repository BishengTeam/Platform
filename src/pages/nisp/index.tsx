import { useEffect, useState, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { RefreshableScrollView } from '@/components/RefreshableScrollView'
import { nispService } from '@/services/nispService'
import type { NispBatch } from '@/services/nispService'
import { ROUTES } from '@/constants/routes'
import styles from './nisp.module.scss'

export default function NispIndexPage() {
  const [batches, setBatches] = useState<NispBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    return nispService.listBatches()
      .then(setBatches)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='NISP 认证' shouldShowBack />
        <RefreshableScrollView className={styles.body} onRefresh={load}>
          {loading && <View className={styles.empty}>加载中...</View>}
          {error && <View className={styles.empty} onClick={load}>加载失败，点击重试</View>}
          {!loading && !error && batches.length === 0 && (
            <View className={styles.empty}>暂无可报名的考试批次</View>
          )}

          {!loading && !error && batches.map((batch) => (
            <View key={batch.id} className={styles.card}>
              <View className={styles.cardHeader}>
                <Text className={styles.title}>{batch.name}</Text>
                <Text className={`${styles.levelBadge} ${batch.level === '1' ? styles.level1 : styles.level2}`}>
                  {batch.level === '1' ? 'NISP一级' : 'NISP二级'}
                </Text>
              </View>

              {batch.exam_date && (
                <View className={styles.row}>
                  <Text className={styles.label}>考试时间</Text>
                  <Text className={styles.value}>{batch.exam_date.slice(0, 10)}</Text>
                </View>
              )}
              {batch.exam_location && (
                <View className={styles.row}>
                  <Text className={styles.label}>考试地点</Text>
                  <Text className={styles.value}>{batch.exam_location}</Text>
                </View>
              )}
              <View className={styles.row}>
                <Text className={styles.label}>剩余名额</Text>
                <Text className={styles.value}>
                  {batch.remaining_count === -1 ? '不限' : batch.remaining_count}
                </Text>
              </View>
              <View className={styles.row}>
                <Text className={styles.label}>
                  {batch.level === '1' ? '一级价格' : '二级价格'}
                </Text>
                <Text className={styles.price}>
                  ¥{((batch.level === '1' ? batch.level1_price_cents : batch.level2_price_cents) / 100).toFixed(2)}
                </Text>
              </View>

              <View style={{ marginTop: 24 }}>
                <Button
                  variant='gradient'
                  onClick={() => Taro.navigateTo({
                    url: `/${ROUTES.NISP_FORM}?batch_id=${batch.id}&level=${batch.level}`
                  })}
                >
                  立即报名
                </Button>
              </View>
            </View>
          ))}

          <View style={{ marginTop: 12 }}>
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
