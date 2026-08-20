import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { h3cService } from '@/services/h3cService'
import { ROUTES } from '@/constants/routes'
import type { H3cExamBatch } from '@/types/h3c'
import styles from './h3c.module.scss'

export default function H3CListPage() {
  const [batches, setBatches] = useState<H3cExamBatch[]>([])
  const [loading, setLoading] = useState(true)

  useLoad(() => {
    h3cService.listBatches()
      .then(setBatches)
      .finally(() => setLoading(false))
  })

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='H3C 认证报名' shouldShowBack />
        <View className={styles.body}>
          <Button variant='secondary' size='lg' onClick={() => Taro.navigateTo({ url: `/${ROUTES.H3C_RECORDS}` })}>
            我的 H3C 报名
          </Button>
          {loading && <View className={styles.empty}>正在加载考试批次...</View>}
          {!loading && batches.length === 0 && <View className={styles.empty}>暂无可报名考试</View>}
          {batches.map((batch) => (
            <View key={batch.id} className={styles.card}>
              <Text className={styles.title}>{batch.name}</Text>
              <Text className={styles.desc}>{batch.description || 'H3C 官方认证考试'}</Text>
              <View className={styles.row}>
                <Text className={styles.label}>考试时间</Text>
                <Text className={styles.value}>{batch.exam_date.slice(0, 16).replace('T', ' ')}</Text>
              </View>
              <View className={styles.row}>
                <Text className={styles.label}>剩余名额</Text>
                <Text className={styles.value}>{batch.remaining_count}</Text>
              </View>
              <View className={styles.row}>
                <Text className={styles.label}>考券 / 学生 / 全额</Text>
                <Text className={styles.price}>
                  {batch.prices.map((price) => (price.price_cents / 100).toFixed(2)).join(' / ')}
                </Text>
              </View>
              <View style={{ marginTop: 12 }}>
                <Button variant='gradient' onClick={() => Taro.navigateTo({ url: `/${ROUTES.H3C_FORM}?batch_id=${batch.id}` })}>
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
