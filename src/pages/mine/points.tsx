import { useState, useEffect, useCallback } from 'react'
import { ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import { getPointsBalance } from '@/services/dataService'
import { pointsMallService } from '@/services/pointsMallService'
import type { MyCoupon } from '@/services/pointsMallService'
import styles from './points.module.scss'

const STATUS_LABELS: Record<string, string> = {
  unused: '可使用',
  used: '已使用',
  expired: '已过期',
}

export default function PointsPage() {
  const [balance, setBalance] = useState(0)
  const [coupons, setCoupons] = useState<MyCoupon[]>([])
  const [couponTab, setCouponTab] = useState<string>('unused')

  const refresh = useCallback(() => {
    getPointsBalance().then(b => setBalance(b.total)).catch(() => {})
    pointsMallService.myCoupons().then(setCoupons).catch(() => setCoupons([]))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const filteredCoupons = couponTab === '' ? coupons : coupons.filter(c => c.status === couponTab)

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader
            title={STRINGS.MINE_POINTS_TITLE}
            shouldShowBack
            rightContent={
              <View
                style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                onClick={() => Taro.navigateTo({ url: '/pages/mine/points-history' })}
              >
                <Text style={{ fontSize: '24rpx', color: '#667085' }}>积分记录</Text>
              </View>
            }
          />
        <ScrollView className={styles.body} scrollY>
          <View className={styles.balanceCard}>
            <Text className={styles.balanceLabel}>{STRINGS.MINE_POINTS_BALANCE}</Text>
            <Text className={styles.balanceValue}>{balance}</Text>
            <Text className={styles.balanceTip}>答题打卡自动获得积分</Text>
            <Button size='sm' variant='secondary' onClick={() => {
              Taro.navigateTo({ url: '/pages/points/mall' })
            }}>去积分商城</Button>
          </View>

          <View className={styles.section}>
            <Text className={styles.sectionTitle}>我的优惠券</Text>
            <View className={styles.couponTabs}>
              {[
                { key: 'unused', label: '可使用' },
                { key: 'used', label: '已使用' },
                { key: 'expired', label: '已过期' },
                { key: '', label: '全部' },
              ].map(tab => (
                <View
                  key={tab.key}
                  className={`${styles.couponTab} ${couponTab === tab.key ? styles.couponTabActive : ''}`}
                  onClick={() => setCouponTab(tab.key)}
                >
                  <Text>{tab.label}</Text>
                </View>
              ))}
            </View>
            <View className={styles.recordList}>
              {filteredCoupons.map(coupon => (
                <View
                  key={coupon.id}
                  className={`${styles.couponCard} ${coupon.status !== 'unused' ? styles.couponCardDisabled : ''}`}
                >
                  <View className={styles.couponLeft}>
                    <Text className={styles.couponDiscount}>{coupon.discount_label}</Text>
                  </View>
                  <View className={styles.couponRight}>
                    <Text className={styles.couponName}>{coupon.name}</Text>
                    <Text className={styles.couponScope}>{coupon.scope_label}</Text>
                    <Text className={styles.couponCode}>{coupon.coupon_code}</Text>
                    <Text className={styles.couponExpiry}>
                      {coupon.status === 'used'
                        ? `已使用 · ${coupon.used_at?.slice(0, 10) ?? ''}`
                        : `有效期至 ${coupon.expires_at.slice(0, 10)}`}
                    </Text>
                  </View>
                  <View className={styles.couponStatusBadge}>
                    <Text>{STATUS_LABELS[coupon.status] || coupon.status}</Text>
                  </View>
                </View>
              ))}
              {filteredCoupons.length === 0 && (
                <View className={styles.emptyState}>
                  <Text>{couponTab === 'unused' ? '暂无可用优惠券' : '暂无优惠券'}</Text>
                  <Text className={styles.emptyHint}>去积分商城兑换优惠券</Text>
                </View>
              )}
            </View>
          </View>

        </ScrollView>
      </View>
    </AuthGuard>
  )
}
