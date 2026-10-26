import { useAuth } from '@/hooks/useAuth'
import { getToken, getAuthSessionId } from '@/utils/authState'
import { requireLogin, navigateWithLogin } from '@/utils/loginCoordinator'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { Icon } from '@/components/Icon'
import { PageHeader } from '@/components/PageHeader'
import { RefreshableScrollView } from '@/components/RefreshableScrollView'
import { ROUTES } from '@/constants/routes'
import { STRINGS } from '@/constants/strings'
import { FEATURES } from '@/constants/features'
import { getPointsBalance } from '@/services/dataService'
import { pointsMallService } from '@/services/pointsMallService'
import type {
  MyCoupon,
  PointsMallItem,
  VirtualOrder,
  VirtualProduct,
} from '@/services/pointsMallService'
import { COUPON_CATEGORY_TABS, formatMinimumSpend, getCouponCategory } from './mallUtils'
import styles from './points.module.scss'

type MainTab = 'virtual' | 'mall' | 'orders' | 'coupons'

const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: 'mall', label: '商城兑换' },
  { key: 'virtual', label: '内容权益' },
  { key: 'orders', label: '我的兑换' },
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

// 兑换开放开关：false 时页面为只读态（余额+积分记录），入口海报照常展示预热
const EXCHANGE_OPEN = FEATURES.pointsExchange

export default function PointsPage() {
  const { isLoggedIn, sessionId } = useAuth()
  const { params } = useRouter()
  const [balance, setBalance] = useState<number | null>(null)
  const [mainTab, setMainTab] = useState<MainTab>(['mall', 'virtual', 'orders', 'coupons'].includes(params.tab || '') ? params.tab as MainTab : 'mall')
  const virtualAttempts = useRef<Record<number, { version: number; key: string }>>({})

  // 商城兑换
  const [items, setItems] = useState<PointsMallItem[]>([])
  const [mallLoading, setMallLoading] = useState(true)
  const [mallError, setMallError] = useState(false)
  const [activeCategory, setActiveCategory] = useState<(typeof COUPON_CATEGORY_TABS)[number]['key']>('all')

  // 内容权益
  const [virtualProducts, setVirtualProducts] = useState<VirtualProduct[]>([])
  const [virtualLoading, setVirtualLoading] = useState(true)
  const [virtualError, setVirtualError] = useState(false)

  // 我的兑换
  const [virtualOrders, setVirtualOrders] = useState<VirtualOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState(false)
  const [ordersLoaded, setOrdersLoaded] = useState(false)

  // 我的优惠券
  const [coupons, setCoupons] = useState<MyCoupon[]>([])
  const [couponsLoading, setCouponsLoading] = useState(false)
  const [couponsError, setCouponsError] = useState(false)
  const [couponsLoaded, setCouponsLoaded] = useState(false)
  const [couponStatus, setCouponStatus] = useState('')
  useEffect(() => {
    setCoupons([]); setVirtualOrders([]); setCouponsLoaded(false); setOrdersLoaded(false)
    setCouponsLoading(false); setOrdersLoading(false)
  }, [sessionId])

  const loadBalance = useCallback(() => {
    if (!getToken()) { setBalance(null); return Promise.resolve() }
    const session = getAuthSessionId()
    return getPointsBalance().then(d => { if (getToken() && getAuthSessionId() === session) setBalance(d.available ?? 0) }).catch(() => setBalance(null))
  }, [])

  const loadMall = useCallback(() => {
    setMallLoading(true)
    setMallError(false)
    return pointsMallService.listItems()
      .then(setItems)
      .catch(() => setMallError(true))
      .finally(() => setMallLoading(false))
  }, [])

  const loadCoupons = useCallback((status: string) => {
    if (!getToken()) return Promise.resolve()
    const session = getAuthSessionId()
    setCouponsLoading(true)
    setCouponsError(false)
    return pointsMallService.myCoupons(status || undefined)
      .then(values => { if (getToken() && getAuthSessionId() === session) setCoupons(values) })
      .catch(() => {
        setCoupons([])
        setCouponsError(true)
      })
      .finally(() => {
        if (getAuthSessionId() === session) { setCouponsLoading(false); setCouponsLoaded(true) }
      })
  }, [])

  const loadVirtualProducts = useCallback(() => {
    setVirtualLoading(true)
    setVirtualError(false)
    return pointsMallService.listVirtualProducts()
      .then(setVirtualProducts)
      .catch(() => setVirtualError(true))
      .finally(() => setVirtualLoading(false))
  }, [])

  const loadVirtualOrders = useCallback(() => {
    if (!getToken()) return Promise.resolve()
    const session = getAuthSessionId()
    setOrdersLoading(true)
    setOrdersError(false)
    return pointsMallService.listVirtualOrders()
      .then(values => { if (getToken() && getAuthSessionId() === session) setVirtualOrders(values) })
      .catch(() => {
        setVirtualOrders([])
        setOrdersError(true)
      })
      .finally(() => { if (getAuthSessionId() === session) { setOrdersLoading(false); setOrdersLoaded(true) } })
  }, [])

  useEffect(() => {
    loadBalance()
    if (!EXCHANGE_OPEN) return
    loadMall()
    loadVirtualProducts()
  }, [loadBalance, loadMall, loadVirtualProducts, isLoggedIn, sessionId])

  useEffect(() => { if (!isLoggedIn) { setBalance(null); setCoupons([]); setVirtualOrders([]); setCouponsLoaded(false); setOrdersLoaded(false); setCouponsLoading(false); setOrdersLoading(false); if (mainTab === 'orders' || mainTab === 'coupons') setMainTab('mall') } }, [isLoggedIn])

  // 首次切到「我的优惠券」时加载，之后由下拉刷新或状态切换刷新
  useEffect(() => {
    if (isLoggedIn && mainTab === 'coupons' && !couponsLoaded && !couponsLoading) {
      loadCoupons(couponStatus)
    }
  }, [mainTab, couponsLoaded, couponsLoading, couponStatus, loadCoupons, isLoggedIn])

  useEffect(() => {
    if (isLoggedIn && mainTab === 'orders' && !ordersLoaded && !ordersLoading) {
      loadVirtualOrders()
    }
  }, [mainTab, ordersLoaded, ordersLoading, loadVirtualOrders, isLoggedIn])

  const refreshCurrentTab = useCallback(async () => {
    if (!EXCHANGE_OPEN) {
      await loadBalance()
      return
    }
    await Promise.all([
      loadBalance(),
      mainTab === 'mall'
        ? loadMall()
        : mainTab === 'virtual'
          ? loadVirtualProducts()
          : mainTab === 'orders'
            ? loadVirtualOrders()
            : loadCoupons(couponStatus),
    ])
  }, [couponStatus, loadBalance, loadCoupons, loadMall, loadVirtualOrders, loadVirtualProducts, mainTab])

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
    void navigateWithLogin('/pages/mine/points-history')
  }

  const virtualTypeLabel = (product: VirtualProduct) => (
    product.product_type === 'course' ? '课程权益' : '题库权益'
  )

  const virtualStockLabel = (product: VirtualProduct) => {
    if (product.stock_limit === null) return '不限量'
    const remaining = product.remaining_stock ?? Math.max(0, product.stock_limit - product.total_redeemed)
    return `剩余 ${remaining} 份`
  }

  const virtualPeriodLabel = (product: VirtualProduct) => (
    product.entitlement_days === null ? '永久有效' : `兑换后 ${product.entitlement_days} 天有效`
  )

  const virtualOrderStatus = (order: VirtualOrder) => (
    order.status === 'completed' ? '已完成' : '已退还'
  )

  const openVirtualContent = (order: VirtualOrder) => {
    if (order.status !== 'completed') return
    if (order.product_type === 'quiz_library') {
      Taro.navigateTo({ url: `/${ROUTES.QUIZ_INDEX}` })
      return
    }
    Taro.showModal({
      title: '课程已兑换',
      content: '课程权益已发放，请前往视频网站使用学习账号观看课程。',
      showCancel: false,
    })
  }

  const makeVirtualIdempotencyKey = (product: VirtualProduct) => {
    const existing = virtualAttempts.current[product.id]
    if (existing && existing.version === product.version) return existing.key
    const key = `pv-${product.id}-${product.version}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    virtualAttempts.current[product.id] = { version: product.version, key }
    return key
  }

  const redeemVirtual = async (item: VirtualProduct) => {
    if (!(await requireLogin(`/pages/mine/points?tab=virtual`))) return
    let precheck
    Taro.showLoading({ title: '检查中', mask: true })
    try {
      precheck = await pointsMallService.precheckVirtualProduct(item.id)
    } catch (error) {
      Taro.hideLoading()
      Taro.showToast({ title: error instanceof Error ? error.message : '预检失败', icon: 'none' })
      return
    }

    if (!precheck.can_redeem) {
      Taro.hideLoading()
      if (precheck.already_owned) {
        Taro.showModal({
          title: '已拥有权益',
          content: '您已拥有该内容的有效权益，可直接去学习或刷题。',
          confirmText: '知道了',
          showCancel: false,
        })
      } else {
        Taro.showToast({
          title: precheck.blocked_reason || '暂不可兑换',
          icon: 'none',
          duration: 3000,
        })
      }
      return
    }

    Taro.hideLoading()
    const product = precheck.product
    const idempotencyKey = makeVirtualIdempotencyKey(product)
    Taro.showModal({
      title: '确认积分兑换',
      content: `消耗 ${product.points_price} 积分兑换「${product.name}」\n当前余额 ${precheck.balance} 分，兑换后 ${precheck.balance_after} 分\n${virtualPeriodLabel(product)}\n兑换成功后不支持自助退还`,
      confirmText: '确认兑换',
      cancelText: '取消',
      success: async (res) => {
        if (!res.confirm) return
        Taro.showLoading({ title: '兑换中', mask: true })
        try {
          const order = await pointsMallService.redeemVirtualProduct({
            product_id: product.id,
            product_version: product.version,
            idempotency_key: idempotencyKey,
          })
          Taro.hideLoading()
          Taro.showModal({
            title: order.idempotent ? '已完成兑换' : '兑换成功',
            content: `订单号：${order.order_no}\n剩余积分：${order.balance} 分`,
            showCancel: false,
          })
          loadBalance()
          loadVirtualProducts()
          setOrdersLoaded(false)
        } catch (error) {
          Taro.hideLoading()
          Taro.showToast({
            title: error instanceof Error ? error.message : '兑换失败，请使用原请求重试',
            icon: 'none',
            duration: 3000,
          })
        }
      },
    })
  }

  const redeem = async (item: PointsMallItem) => {
    if (!(await requireLogin('/pages/mine/points?tab=mall'))) return
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
    <>
      <View className={styles.page}>
        <PageHeader title={STRINGS.MINE_POINTS_TITLE} shouldShowBack />
        <RefreshableScrollView className={styles.body} onRefresh={refreshCurrentTab}>
          <View className={styles.balanceCard}>
            <View className={styles.balanceMain}>
              <Text className={styles.balanceLabel}>{STRINGS.MINE_POINTS_BALANCE}</Text>
              <View className={styles.balanceRow}>
                <Icon name='coin' size={32} color='rgba(255, 255, 255, 0.92)' className={styles.balanceIcon} />
                <Text className={`${styles.balanceValue} ${!isLoggedIn ? styles.guestBalanceValue : ''}`}>{isLoggedIn ? balance ?? '—' : '登录后查看'}</Text>
                {isLoggedIn && balance !== null && <Text className={styles.balanceUnit}>分</Text>}
              </View>
            </View>
            <View className={styles.historyBtn} onClick={goHistory}>
              <Text>{STRINGS.MINE_POINTS_HISTORY}</Text>
              <Icon name='chevron-right' size={22} color='rgba(255, 255, 255, 0.88)' className={styles.historyArrow} />
            </View>
          </View>

          {/* 只读态：兑换未开放，用预告条解释页面构成，tab 栏与兑换面板整体隐藏 */}
          {!EXCHANGE_OPEN && (
            <View className={styles.comingSoonBar}>
              <Icon name='gift' size={28} color='#C67C00' />
              <Text className={styles.comingSoonText}>{STRINGS.MINE_POINTS_EXCHANGE_COMING_SOON}</Text>
            </View>
          )}

          {EXCHANGE_OPEN && (
            <View className={styles.mainTabs}>
            {MAIN_TABS.map(tab => {
              const isActive = tab.key === mainTab
              return (
                <View
                  key={tab.key}
                  className={`${styles.mainTab} ${isActive ? styles.mainTabActive : ''}`}
                  onClick={async () => { if (['orders', 'coupons'].includes(tab.key) && !(await requireLogin(`/pages/mine/points?tab=${tab.key}`))) return; setMainTab(tab.key) }}
                >
                  <Text>{tab.label}</Text>
                </View>
              )
            })}
            </View>
          )}

          {EXCHANGE_OPEN && mainTab === 'mall' && (
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
                  </View>
                  <View className={styles.actionArea}>
                    <View className={styles.pointsCost}>
                      <Text className={styles.pointsCostValue}>{item.points_cost}</Text>
                      <Text className={styles.pointsCostUnit}>积分</Text>
                    </View>
                    {item.can_redeem || (!isLoggedIn && item.redeem_blocked_reason === '登录后兑换') ? (
                      <View className={styles.redeemBtn} onClick={() => redeem(item)}>
                        <Text>{isLoggedIn ? '立即兑换' : '登录后兑换'}</Text>
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

          {EXCHANGE_OPEN && mainTab === 'virtual' && (
            <View>
              {virtualLoading && <View className={styles.statusBlock}>加载中...</View>}
              {virtualError && <View className={styles.statusBlock}>加载失败，下拉重试</View>}
              {!virtualLoading && !virtualError && virtualProducts.length === 0 && (
                <View className={styles.statusBlock}>暂无可兑换的课程或题库</View>
              )}

              {!virtualLoading && !virtualError && virtualProducts.map(item => (
                <View key={item.id} className={styles.virtualCard}>
                  <View className={styles.virtualLeft}>
                    <Text className={styles.virtualPoints}>{item.points_price}</Text>
                    <Text className={styles.virtualPointsUnit}>积分</Text>
                    <Text className={styles.virtualType}>{virtualTypeLabel(item)}</Text>
                  </View>
                  <View className={styles.virtualInfo}>
                    <Text className={styles.virtualName}>{item.name}</Text>
                    <Text className={styles.virtualMeta}>
                      {virtualStockLabel(item)} · {virtualPeriodLabel(item)}
                    </Text>
                    {item.description && (
                      <Text className={styles.virtualDescription}>{item.description}</Text>
                    )}
                    <View
                      className={
                        item.status === 'published' && (item.stock_limit === null || (item.remaining_stock ?? 1) > 0)
                          ? styles.redeemBtn
                          : styles.redeemBtnDisabled
                      }
                      onClick={() => redeemVirtual(item)}
                    >
                      <Text>{item.status === 'published' ? '立即兑换' : '暂不可兑换'}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {EXCHANGE_OPEN && mainTab === 'orders' && (
            <View>
              {ordersLoading && <View className={styles.statusBlock}>加载中...</View>}
              {ordersError && <View className={styles.statusBlock}>加载失败，下拉重试</View>}
              {!ordersLoading && !ordersError && virtualOrders.length === 0 && (
                <View className={styles.statusBlock}>暂无兑换记录</View>
              )}

              {!ordersLoading && !ordersError && virtualOrders.map(order => (
                <View
                  key={order.id}
                  className={styles.virtualOrderCard}
                  onClick={() => openVirtualContent(order)}
                >
                  <View className={styles.virtualOrderTop}>
                    <Text className={styles.virtualOrderName}>{order.product_name}</Text>
                    <Text
                      className={`${styles.virtualOrderBadge} ${
                        order.status === 'completed' ? styles.virtualOrderBadgeActive : ''
                      }`}
                    >
                      {virtualOrderStatus(order)}
                    </Text>
                  </View>
                  <Text className={styles.virtualOrderMeta}>
                    {order.product_type === 'course' ? '课程权益' : '题库权益'} · 消耗 {order.points_cost} 积分
                  </Text>
                  <Text className={styles.virtualOrderMeta}>
                    下单时间：{order.created_at.slice(0, 16).replace('T', ' ')}
                  </Text>
                  <Text className={styles.virtualOrderMeta}>
                    {order.ends_at
                      ? `有效期至 ${order.ends_at.slice(0, 10)}`
                      : '永久有效'}
                  </Text>
                  {order.status === 'completed' && (
                    <Text className={styles.virtualOrderAction}>
                      {order.product_type === 'course' ? '查看学习方式' : '去刷题'}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {EXCHANGE_OPEN && mainTab === 'coupons' && (
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
        </RefreshableScrollView>
      </View>
    </>
  )
}
