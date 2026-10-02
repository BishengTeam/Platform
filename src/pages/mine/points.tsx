import { useCallback, useEffect, useMemo, useState } from 'react'
import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { Icon } from '@/components/Icon'
import { PageHeader } from '@/components/PageHeader'
import { STRINGS } from '@/constants/strings'
import { getPointsBalance } from '@/services/dataService'
import { pointsMallService } from '@/services/pointsMallService'
import type { MyCoupon, PointsMallItem } from '@/services/pointsMallService'
import { COUPON_CATEGORY_TABS, formatMinimumSpend, getCouponCategory } from './mallUtils'
import styles from './points.module.scss'

type MainTab = 'mall' | 'coupons'

const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: 'mall', label: '商城兑换' },
  { key: 'coupons', label: '我的优惠券' },
]

const COUPON_STATUS_TABS = [
  { key: '', label: '全部' },
  { key: 'unused', label: '可使用' },
  { key: 'used', label: '已使用' },
  { key: 'expired', label: '已过期' },
]

const STATUS_BADGE_LABELS: Record<MyCoupon['status'], string> = {
  unused: '可使用',
  used: '已使用',
  expired: '已过期',
}

export default function PointsPage() {
  const [balance, setBalance] = useState(0)
  const [mainTab, setMainTab] = useState<MainTab>('mall')

  // 商城兑换
  const [items, setItems] = useState<PointsMallItem[]>([])
  const [mallLoading, setMallLoading] = useState(true)
  const [mallError, setMallError] = useState(false)
  const [activeCategory, setActiveCategory] = useState<(typeof COUPON_CATEGORY_TABS)[number]['key']>('all')

  // 我的优惠券
  const [coupons, setCoupons] = useState<MyCoupon[]>([])
  const [couponsLoading, setCouponsLoading] = useState(false)
  const [couponsError, setCouponsError] = useState(false)
  const [couponsLoaded, setCouponsLoaded] = useState(false)
  const [couponStatus, setCouponStatus] = useState('')

  const loadBalance = useCallback(() => {
    getPointsBalance().then(d => setBalance(d.available ?? 0)).catch(() => {})
  }, [])

  const loadMall = useCallback(() => {
    setMallLoading(true)
    setMallError(false)
    pointsMallService.listItems()
      .then(setItems)
      .catch(() => setMallError(true))
      .finally(() => setMallLoading(false))
  }, [])

  const loadCoupons = useCallback((status: string) => {
    setCouponsLoading(true)
    setCouponsError(false)
    pointsMallService.myCoupons(status || undefined)
      .then(setCoupons)
      .catch(() => {
        setCoupons([])
        setCouponsError(true)
      })
      .finally(() => {
        setCouponsLoading(false)
        setCouponsLoaded(true)
      })
  }, [])

  useEffect(() => {
    loadBalance()
    loadMall()
  }, [loadBalance, loadMall])

  // 首次切到「我的优惠券」时加载，之后由下拉刷新或状态切换刷新
  useEffect(() => {
    if (mainTab === 'coupons' && !couponsLoaded && !couponsLoading) {
      loadCoupons(couponStatus)
    }
  }, [mainTab, couponsLoaded, couponsLoading, couponStatus, loadCoupons])

  usePullDownRefresh(() => {
    loadBalance()
    if (mainTab === 'mall') {
      loadMall()
    } else {
      loadCoupons(couponStatus)
    }
    Taro.stopPullDownRefresh()
  })

  const visibleItems = useMemo(() => {
    if (activeCategory === 'all') return items
    return items.filter(item => getCouponCategory(item) === activeCategory)
  }, [activeCategory, items])

  const switchCouponStatus = (status: string) => {
    setCouponStatus(status)
    loadCoupons(status)
  }

  const copyCode = (code: string) => {
    Taro.setClipboardData({
      data: code,
      success: () => Taro.showToast({ title: '已复制', icon: 'success', duration: 1500 }),
    })
  }

  const goHistory = () => {
    Taro.navigateTo({ url: '/pages/mine/points-history' })
  }

  const redeem = (item: PointsMallItem) => {
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
          loadBalance()
          loadMall()
          // 兑换后让优惠券 Tab 的缓存失效，切过去时重新拉取
          setCouponsLoaded(false)
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
        <PageHeader title={STRINGS.MINE_POINTS_TITLE} shouldShowBack />
        <ScrollView className={styles.body} scrollY>
          <View className={styles.balanceCard}>
            <View className={styles.balanceMain}>
              <Text className={styles.balanceLabel}>{STRINGS.MINE_POINTS_BALANCE}</Text>
              <View className={styles.balanceRow}>
                <Icon name='coin' size={32} color='rgba(255, 255, 255, 0.92)' className={styles.balanceIcon} />
                <Text className={styles.balanceValue}>{balance}</Text>
                <Text className={styles.balanceUnit}>分</Text>
              </View>
            </View>
            <View className={styles.historyBtn} onClick={goHistory}>
              <Text>{STRINGS.MINE_POINTS_HISTORY}</Text>
              <Icon name='chevron-right' size={22} color='rgba(255, 255, 255, 0.88)' className={styles.historyArrow} />
            </View>
          </View>

          <View className={styles.mainTabs}>
            {MAIN_TABS.map(tab => {
              const isActive = tab.key === mainTab
              return (
                <View
                  key={tab.key}
                  className={`${styles.mainTab} ${isActive ? styles.mainTabActive : ''}`}
                  onClick={() => setMainTab(tab.key)}
                >
                  <Text>{tab.label}</Text>
                </View>
              )
            })}
          </View>

          {mainTab === 'mall' && (
            <View>
              <ScrollView className={styles.filterBar} scrollX enhanced showScrollbar={false}>
                <View className={styles.filterTabs}>
                  {COUPON_CATEGORY_TABS.map(tab => {
                    const isActive = tab.key === activeCategory
                    return (
                      <View
                        key={tab.key}
                        className={`${styles.filterTab} ${isActive ? styles.filterTabActive : ''}`}
                        onClick={() => setActiveCategory(tab.key)}
                      >
                        <Text>{tab.label}</Text>
                      </View>
                    )
                  })}
                </View>
              </ScrollView>

              {mallLoading && <View className={styles.statusBlock}>加载中...</View>}
              {mallError && <View className={styles.statusBlock}>加载失败，下拉重试</View>}
              {!mallLoading && !mallError && visibleItems.length === 0 && (
                <View className={styles.statusBlock}>
                  {items.length === 0 ? '暂无可兑换的优惠券' : '该分类暂无可兑换的优惠券'}
                </View>
              )}

              {!mallLoading && !mallError && visibleItems.map(item => (
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

              {!mallLoading && !mallError && visibleItems.length > 0 && (
                <View className={styles.listEnd}>
                  <Text>— 暂无更多优惠券 —</Text>
                </View>
              )}
            </View>
          )}

          {mainTab === 'coupons' && (
            <View>
              <ScrollView className={styles.filterBar} scrollX enhanced showScrollbar={false}>
                <View className={styles.filterTabs}>
                  {COUPON_STATUS_TABS.map(tab => {
                    const isActive = tab.key === couponStatus
                    return (
                      <View
                        key={tab.key || 'all'}
                        className={`${styles.filterTab} ${isActive ? styles.filterTabActive : ''}`}
                        onClick={() => switchCouponStatus(tab.key)}
                      >
                        <Text>{tab.label}</Text>
                      </View>
                    )
                  })}
                </View>
              </ScrollView>

              {couponsLoading && <View className={styles.statusBlock}>加载中...</View>}
              {couponsError && <View className={styles.statusBlock}>加载失败，下拉重试</View>}
              {!couponsLoading && !couponsError && coupons.length === 0 && (
                <View className={styles.statusBlock}>暂无优惠券</View>
              )}

              {!couponsLoading && !couponsError && coupons.map(coupon => {
                const isDisabled = coupon.status !== 'unused'
                return (
                  <View
                    key={coupon.id}
                    className={`${styles.myCouponCard} ${isDisabled ? styles.myCouponCardDisabled : ''}`}
                    onClick={() => !isDisabled && copyCode(coupon.coupon_code)}
                  >
                    <View className={styles.myCouponLeft}>
                      <Text className={styles.myCouponDiscount}>{coupon.discount_label}</Text>
                      <Text className={styles.myCouponType}>
                        {coupon.discount_type === 'percent' ? '折扣券' : '满减券'}
                      </Text>
                    </View>
                    <View className={styles.myCouponInfo}>
                      <Text className={styles.myCouponName}>{coupon.name}</Text>
                      <Text className={styles.myCouponMeta}>{coupon.scope_label}</Text>
                      <Text className={styles.myCouponCode}>
                        {coupon.coupon_code}{isDisabled ? '' : ' · 点击复制'}
                      </Text>
                      <Text className={styles.myCouponExpiry}>
                        {coupon.status === 'used'
                          ? `已使用 · ${coupon.used_at?.slice(0, 10) ?? ''}`
                          : `有效期至 ${coupon.expires_at.slice(0, 10)}`}
                      </Text>
                    </View>
                    <View className={styles.statusBadge}>
                      <Text>{STATUS_BADGE_LABELS[coupon.status]}</Text>
                    </View>
                  </View>
                )
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
