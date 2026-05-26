import { View, Text } from '@tarojs/components'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import { getPointsBalance, getPointRecords } from '@/services/dataService'
import styles from './points.module.scss'

export default function PointsPage() {
  const balance = getPointsBalance()
  const records = getPointRecords()

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.MINE_POINTS_TITLE} shouldShowBack />
        <View className={styles.body}>
          <View className={styles.balanceCard}>
            <Text className={styles.balanceLabel}>{STRINGS.MINE_POINTS_BALANCE}</Text>
            <Text className={styles.balanceValue}>{balance}</Text>
            <Text className={styles.balanceTip}>{STRINGS.MINE_POINTS_REDEEM_TIP}</Text>
            <Button size='sm' variant='secondary'>{STRINGS.MINE_POINTS_REDEEM}</Button>
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
            </View>
          </View>
        </View>
      </View>
    </AuthGuard>
  )
}
