import { useCallback, useEffect, useState } from 'react'
import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { pointsMallService } from '@/services/pointsMallService'
import { getPointsBalance } from '@/services/dataService'
import type { PointsMallItem } from '@/services/pointsMallService'
import styles from './mall.module.scss'

export default function PointsMallPage() {
  const [items, setItems] = useState<PointsMallItem[]>([])
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    Promise.all([
      pointsMallService.listItems(),
      getPointsBalance().then(d => d.available ?? 0).catch(() => 0),
    ])
      .then(([list, bal]) => { setItems(list); setBalance(bal) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])
  usePullDownRefresh(() => { load(); Taro.stopPullDownRefresh() })

  const redeem = async (item: PointsMallItem) => {
    if (!item.can_redeem) return
    Taro.showModal({
      title: '确认兑换',
      content: `消耗 ${item.points_cost} 积分兑换「${item.name}」？`,
      confirmText: '确认兑换',
      cancelText: '取消',
      success: async (res) => {
        if (!res.confirm) return
        Taro.showLoading({ title: '兑换中', mask: true })
        try {
          const coupon = await pointsMallService.redeem(item.id)
          Taro.hideLoading()
          Taro.showModal({
            title: '兑换成功',
            content: `券码：${coupon.coupon_code}\n有效期至：${coupon.expires_at.slice(0, 10)}`,
            showCancel: false,
          })
          load()
        } catch (err) {
          Taro.hideLoading()
          Taro.showToast({ title: err instanceof Error ? err.message : '兑换失败', icon: 'none', duration: 3000 })
        }
      },
    })
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='积分商城' shouldShowBack />
        <ScrollView className={styles.body} scrollY>
          <View className={styles.balanceCard}>
            <View>
              <Text className={styles.balanceLabel}>我的积分</Text>
              <View>
                <Text className={styles.balanceValue}>{balance}</Text>
                <Text className={styles.balanceUnit}>分</Text>
              </View>
            </View>
            <View className={styles.myCouponsBtn} onClick={() => Taro.navigateTo({ url: '/pages/points/coupons' })}>
              <Text>我的优惠券</Text>
            </View>
          </View>

          {loading && <View className={styles.loading}>加载中...</View>}
          {error && <View className={styles.empty}>加载失败，下拉重试</View>}
          {!loading && !error && items.length === 0 && (
            <View className={styles.empty}>暂无可兑换的优惠券</View>
          )}

          {!loading && !error && items.map((item) => (
            <View key={item.id} className={styles.card}>
              <View className={styles.cardHeader}>
                <Text className={styles.cardTitle}>{item.name}</Text>
                <Text className={styles.cardBadge}>{item.discount_label}</Text>
              </View>
              {item.description && <Text className={styles.cardDesc}>{item.description}</Text>}
              <View className={styles.cardMeta}>
                <View>
                  <Text className={styles.scopeLabel}>{item.scope_label}</Text>
                  <Text className={styles.scopeLabel}> · 满 {(item.min_order_amount_cents / 100).toFixed(0)} 元可用</Text>
                </View>
                <View>
                  <Text className={styles.pointsCost}>{item.points_cost}</Text>
                  <Text className={styles.pointsCostUnit}>积分</Text>
                </View>
              </View>
              <View style={{ marginTop: 20 }}>
                {item.can_redeem ? (
                  <View className={styles.redeemBtn} onClick={() => redeem(item)}>
                    <Text>立即兑换</Text>
                  </View>
                ) : (
                  <View className={styles.redeemBtnDisabled}>
                    <Text>{item.redeem_blocked_reason || '不可兑换'}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
