import { useCallback, useEffect, useState } from 'react'
import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { pointsMallService } from '@/services/pointsMallService'
import type { MyCoupon } from '@/services/pointsMallService'
import styles from './coupons.module.scss'

const TABS = [
  { key: '', label: '全部' },
  { key: 'unused', label: '可使用' },
  { key: 'used', label: '已使用' },
  { key: 'expired', label: '已过期' },
]

export default function MyCouponsPage() {
  const [activeTab, setActiveTab] = useState('')
  const [coupons, setCoupons] = useState<MyCoupon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback((status: string) => {
    setLoading(true)
    setError(false)
    pointsMallService.myCoupons(status || undefined)
      .then(setCoupons)
      .catch(() => { setCoupons([]); setError(true) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(activeTab) }, [activeTab, load])
  usePullDownRefresh(() => { load(activeTab); Taro.stopPullDownRefresh() })

  const copyCode = (code: string) => {
    Taro.setClipboardData({
      data: code,
      success: () => Taro.showToast({ title: '已复制', icon: 'success', duration: 1500 }),
    })
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='我的优惠券' shouldShowBack />
        <ScrollView className={styles.body} scrollY>
          <View className={styles.tabs}>
            {TABS.map(tab => (
              <View
                key={tab.key}
                className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <Text>{tab.label}</Text>
              </View>
            ))}
          </View>

          {loading && <View className={styles.loading}>加载中...</View>}
          {error && <View className={styles.empty}>加载失败，下拉重试</View>}
          {!loading && !error && coupons.length === 0 && (
            <View className={styles.empty}>暂无优惠券</View>
          )}

          {!loading && !error && coupons.map(coupon => {
            const isDisabled = coupon.status !== 'unused'
            return (
              <View
                key={coupon.id}
                className={`${styles.card} ${isDisabled ? styles.cardDisabled : ''}`}
                onClick={() => !isDisabled && copyCode(coupon.coupon_code)}
              >
                <View className={`${styles.left} ${isDisabled ? styles.leftDisabled : ''}`}>
                  <Text className={styles.discountValue}>{coupon.discount_label}</Text>
                </View>
                <View className={styles.right}>
                  <Text className={styles.couponName}>{coupon.name}</Text>
                  <Text className={styles.couponScope}>{coupon.scope_label}</Text>
                  <Text className={styles.couponCode}>{coupon.coupon_code}</Text>
                  <Text className={styles.couponExpiry}>
                    {coupon.status === 'used'
                      ? `已使用 · ${coupon.used_at?.slice(0, 10) ?? ''}`
                      : `有效期至 ${coupon.expires_at.slice(0, 10)}`}
                  </Text>
                </View>
              </View>
            )
          })}
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
