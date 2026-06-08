import { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import { getPointsBalance, getPointRecords, getCoupons, redeemPoints } from '@/services/dataService'
import styles from './points.module.scss'

export default function PointsPage() {
  const [balance, setBalance] = useState(0)
  const [records, setRecords] = useState([])
  const [coupons, setCoupons] = useState([])

  useEffect(() => {
    getPointsBalance().then(setBalance).catch(() => {})
    getPointRecords().then(setRecords).catch(() => {})
    getCoupons().then(setCoupons).catch(() => {})
  }, [])

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.MINE_POINTS_TITLE} shouldShowBack />
        <View className={styles.body}>
          <View className={styles.balanceCard}>
            <Text className={styles.balanceLabel}>{STRINGS.MINE_POINTS_BALANCE}</Text>
            <Text className={styles.balanceValue}>{balance}</Text>
            <Text className={styles.balanceTip}>{STRINGS.MINE_POINTS_REDEEM_TIP}</Text>
            <Button size='sm' variant='secondary' onClick={() => {
            redeemPoints({ redeem_type: 'exam_discount', amount: 50 }).then(() => {
              getPointsBalance().then(setBalance).catch(() => {})
              getPointRecords().then(setRecords).catch(() => {})
              Taro.showToast({ title: STRINGS.MINE_POINTS_REDEEM + '成功', icon: 'success' })
            }).catch(() => {
              Taro.showToast({ title: '兑换失败', icon: 'none' })
            })
          }}>{STRINGS.MINE_POINTS_REDEEM}</Button>
          </View>

          {coupons.length > 0 && (
            <View className={styles.section}>
              <Text className={styles.sectionTitle}>优惠券</Text>
              <View className={styles.recordList}>
                {coupons.map(c => (
                  <View key={c.id} className={styles.recordItem}>
                    <View className={styles.recordInfo}>
                      <Text className={styles.recordDesc}>{c.name}</Text>
                      <Text className={styles.recordDate}>有效期至 {c.expire_at}</Text>
                    </View>
                    <Text className={styles.recordAmount}>¥{c.amount}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

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
            </View>
          </View>
        </View>
      </View>
    </AuthGuard>
  )
}