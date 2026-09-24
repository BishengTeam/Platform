import { useState, useEffect, useCallback } from 'react'
import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { STRINGS } from '@/constants/strings'
import { getPointRecords } from '@/services/dataService'
import type { PointRecord } from '@/types/mine'
import styles from './points-history.module.scss'

export default function PointsHistoryPage() {
  const [records, setRecords] = useState<PointRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    getPointRecords()
      .then(setRecords)
      .catch(() => { setRecords([]); setError(true) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])
  usePullDownRefresh(() => { load(); Taro.stopPullDownRefresh() })

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='积分记录' shouldShowBack />
        <ScrollView className={styles.body} scrollY>
          {loading && <View className={styles.empty}>加载中...</View>}
          {error && <View className={styles.empty} onClick={load}>加载失败，点击重试</View>}
          {!loading && !error && records.length === 0 && (
            <View className={styles.empty}>
              <Text>暂无积分记录</Text>
              <Text className={styles.emptyHint}>答题打卡后自动获得积分</Text>
            </View>
          )}
          {!loading && !error && records.map(r => (
            <View key={r.id} className={styles.recordItem}>
              <View className={styles.recordInfo}>
                <Text className={styles.recordDesc}>{r.description}</Text>
                <Text className={styles.recordDate}>{r.createdAt}</Text>
              </View>
              <Text className={`${styles.recordAmount} ${r.type === 'earn' ? styles.earn : styles.redeem}`}>
                {r.type === 'earn' ? '+' : ''}{r.amount}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
