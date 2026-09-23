import { useState, useEffect, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import { getPointsBalance, getPointRecords } from '@/services/dataService'
import type { PointRecord } from '@/types/mine'
import styles from './points.module.scss'

export default function PointsPage() {
  const [balance, setBalance] = useState(0)
  const [records, setRecords] = useState<PointRecord[]>([])

  const refresh = useCallback(() => {
    getPointsBalance().then(b => setBalance(b.total)).catch(() => {})
    getPointRecords().then(setRecords).catch(() => {})
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.MINE_POINTS_TITLE} shouldShowBack />
        <View className={styles.body}>
          <View className={styles.balanceCard}>
            <Text className={styles.balanceLabel}>{STRINGS.MINE_POINTS_BALANCE}</Text>
            <Text className={styles.balanceValue}>{balance}</Text>
            <Text className={styles.balanceTip}>答题打卡自动获得积分</Text>
            <Button size='sm' variant='secondary' onClick={() => {
              Taro.navigateTo({ url: '/pages/points/mall' })
            }}>去积分商城</Button>
          </View>

          <View className={styles.section}>
            <Text className={styles.sectionTitle}>{STRINGS.MINE_POINTS_HISTORY}</Text>
            <View className={styles.recordList}>
              {records.map(r => (
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
              {records.length === 0 && (
                <View className={styles.recordItem}>
                  <View className={styles.recordInfo}>
                    <Text className={styles.recordDesc}>暂无积分记录</Text>
                    <Text className={styles.recordDate}>答题打卡后自动获得积分</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </AuthGuard>
  )
}
