import { useCallback, useEffect, useMemo, useState } from 'react'
import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { Icon } from '@/components/Icon'
import { PageHeader } from '@/components/PageHeader'
import { pointsMallService } from '@/services/pointsMallService'
import { getPointsBalance } from '@/services/dataService'
import type { PointsMallItem } from '@/services/pointsMallService'
import { COUPON_CATEGORY_TABS, getCouponCategory, formatMinimumSpend } from './mallUtils'
import styles from './mall.module.scss'

export default function PointsMallPage() {
  const [items, setItems] = useState<PointsMallItem[]>([])
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeCategory, setActiveCategory] = useState<(typeof COUPON_CATEGORY_TABS)[number]['key']>('all')

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

  const visibleItems = useMemo(() => {
    if (activeCategory === 'all') return items
    return items.filter(item => getCouponCategory(item) === activeCategory)
  }, [activeCategory, items])

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
            <View className={styles.balanceMain}>
              <Text className={styles.balanceLabel}>我的积分</Text>
              <View className={styles.balanceRow}>
                <Icon name='coin' size={32} color='rgba(255, 255, 255, 0.92)' className={styles.balanceIcon} />
                <Text className={styles.balanceValue}>{balance}</Text>
                <Text className={styles.balanceUnit}>分</Text>
              </View>
            </View>
            <View className={styles.myCouponsBtn} onClick={() => Taro.navigateTo({ url: '/pages/points/coupons' })}>
              <Text>我的优惠券</Text>
              <Icon name='chevron-right' size={22} color='rgba(255, 255, 255, 0.88)' className={styles.myCouponsArrow} />
            </View>
          </View>

          <ScrollView className={styles.categoryBar} scrollX enhanced showScrollbar={false}>
            <View className={styles.categoryTabs}>
              {COUPON_CATEGORY_TABS.map(tab => {
                const isActive = tab.key === activeCategory
                return (
                  <View
                    key={tab.key}
                    className={`${styles.categoryTab} ${isActive ? styles.categoryTabActive : ''}`}
                    onClick={() => setActiveCategory(tab.key)}
                  >
                    <Text>{tab.label}</Text>
                  </View>
                )
              })}
            </View>
          </ScrollView>

          {loading && <View className={styles.loading}>加载中...</View>}
          {error && <View className={styles.empty}>加载失败，下拉重试</View>}
          {!loading && !error && visibleItems.length === 0 && (
            <View className={styles.empty}>
              {items.length === 0 ? '暂无可兑换的优惠券' : '该分类暂无可兑换的优惠券'}
            </View>
          )}

          {!loading && !error && visibleItems.map((item) => (
            <View key={item.id} className={styles.couponCard}>
              <View className={styles.amountArea}>
                <Text className={styles.amountValue}>{item.discount_label}</Text>
                <Text className={styles.amountType}>
                  {item.discount_type === 'percent' ? '折扣券' : '满减券'}
                </Text>
              </View>
              <View className={styles.infoArea}>
                <Text className={styles.couponTitle}>{item.name}</Text>
                <Text className={styles.couponSubtitle}>
                  {item.scope_label} · 满{formatMinimumSpend(item.min_order_amount_cents)}元可用
                </Text>
                {item.description && <Text className={styles.couponDesc}>{item.description}</Text>}
              </View>
              <View className={styles.actionArea}>
                <View className={styles.pointsCost}>
                  <Text className={styles.pointsCostValue}>{item.points_cost}</Text>
                  <Text className={styles.pointsCostUnit}>积分</Text>
                </View>
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

          {!loading && !error && visibleItems.length > 0 && (
            <View className={styles.listEnd}>
              <Text>— 暂无更多优惠券 —</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
