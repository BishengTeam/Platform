import { useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { useAuth } from '@/hooks/useAuth'
import { usePaymentProgress } from '@/hooks/usePaymentProgress'
import { paymentProgress } from '@/utils/paymentProgress'
import { ROUTES } from '@/constants/routes'
import styles from './result.module.scss'

export default function ResultPage() {
  const [orderId, setOrderId] = useState(0)
  const [routeReady, setRouteReady] = useState(false)
  const [contactExpanded, setContactExpanded] = useState(false)
  const [actionError, setActionError] = useState('')
  const { isLoggedIn, sessionId } = useAuth()
  const { snapshot, loading, refreshing, error, now, refresh } = usePaymentProgress(orderId, isLoggedIn, sessionId)
  useLoad(options => {
    const id = Number(options?.order_id)
    setOrderId(Number.isSafeInteger(id) && id > 0 ? id : 0)
    setRouteReady(true)
  })
  const view = snapshot ? paymentProgress(snapshot, now) : null
  const account = snapshot?.payment?.account
  const openOrder = () => void Taro.reLaunch({ url: `/pages/order-detail/index?order_id=${orderId}` })
  const returnHome = () => void Taro.switchTab({ url: '/pages/index/index' })
  const showContact = () => {
    setContactExpanded(!contactExpanded)
    if (!contactExpanded) Taro.nextTick(() => { void Taro.pageScrollTo({ selector: '#payment-contact', duration: 200 }).catch(() => {}) })
  }
  const copy = (value: string) => {
    setActionError('')
    void Taro.setClipboardData({ data: value }).catch(() => setActionError('复制失败，请重试'))
  }
  const primaryAction = () => {
    if (view?.action === 'registration') void Taro.reLaunch({ url: `/${ROUTES.MINE_REGISTRATIONS}` })
    else if (view?.action === 'contact') showContact()
    else openOrder()
  }
  const waiting = !routeReady || loading
  return <AuthGuard><View className={styles.page}>
    <PageHeader title='付款进度' shouldShowBack={false} />
    <View className={styles.body}>
      <View className={`${styles.statusCard} ${styles[`tone_${view?.tone || 'neutral'}`]}`}>
        <View className={styles.statusIcon}><Text>{view?.symbol || '…'}</Text></View>
        <Text className={styles.title}>{view?.title || (waiting ? '正在获取付款进度…' : orderId ? '暂时无法获取付款进度' : '订单不存在')}</Text>
        <Text className={styles.description}>{view?.description || (waiting ? '请稍候，正在核实订单的最新状态。' : '请刷新重试，或返回订单查看处理情况。')}</Text>
        {view?.poll && <Text className={styles.autoRefresh}>核账期间每 30 秒自动更新</Text>}
      </View>

      {view?.reason && <View className={styles.noticeCard}>
        <Text className={styles.noticeTitle}>{snapshot?.payment?.status === 'returned' ? '退回原因' : '处理说明'}</Text>
        <Text className={styles.noticeText}>{view.reason}</Text>
      </View>}
      {view?.deadline && <View className={`${styles.deadlineCard} ${styles[`deadline_${view.deadline.tone}`]}`}>
        <Text className={styles.deadlineTitle}>{view.deadline.title}</Text>
        <Text className={styles.deadlineExact}>{view.deadline.exact}</Text>
      </View>}

      {snapshot && view && <View className={styles.orderCard}>
        <Text className={styles.cardLabel}>{snapshot.order.orderKind === 'certification' ? '认证订单' : '订单信息'}</Text>
        <Text className={styles.productTitle}>{snapshot.order.productTitle}</Text>
        <View className={styles.amountRow}><Text className={styles.cardLabel}>{view.amountLabel}</Text><Text className={styles.amount}>¥{view.amount}</Text></View>
        <View className={styles.detailLink} onClick={openOrder}><Text>订单详情</Text><Text>查看 ›</Text></View>
      </View>}

      {(error || actionError) && <View className={styles.errorCard}>
        <Text className={styles.errorText}>{actionError || (snapshot ? error : orderId ? '进度获取失败，请刷新重试。' : '请从订单列表重新进入。')}</Text>
        {orderId > 0 && <Text className={styles.textLink} onClick={() => { if (!refreshing) void refresh() }}>{refreshing ? '正在更新…' : '重新获取进度'}</Text>}
      </View>}
      {view ? <View className={styles.actions}>
        <Button variant='gradient' size='lg' className={styles.primaryButton} onClick={primaryAction}>{view.actionLabel}</Button>
        <View className={styles.secondaryActions}>
          <Text className={styles.textLink} onClick={() => { if (!refreshing) void refresh() }}>{refreshing ? '正在更新…' : '刷新进度'}</Text>
          {view.hasContact && view.action !== 'contact' && <Text className={styles.textLink} onClick={showContact}>联系管理员</Text>}
        </View>
      </View> : !waiting && orderId > 0 && <View className={styles.actions}>
        <Button variant='gradient' className={styles.primaryButton} loading={refreshing} disabled={refreshing} onClick={() => void refresh()}>重新获取进度</Button>
        <Text className={styles.textLink} onClick={openOrder}>查看订单</Text>
      </View>}

      {contactExpanded && view?.hasContact && account && <View id='payment-contact' className={styles.contactCard}>
        <View className={styles.contactHeading}><Text className={styles.productTitle}>联系管理员</Text><Text className={styles.textLink} onClick={() => setContactExpanded(false)}>收起</Text></View>
        {account.contact_name && <Text className={styles.contactName}>{account.contact_name}</Text>}
        {account.contact_phone && <View className={styles.contactRow}>
          <View><Text className={styles.cardLabel}>联系电话</Text><Text className={styles.contactValue}>{account.contact_phone}</Text></View>
          <View className={styles.contactActions}><Text className={styles.textLink} onClick={() => {
            setActionError('')
            void Taro.makePhoneCall({ phoneNumber: account.contact_phone }).catch(reason => {
              if (!/cancel/i.test(String(reason?.errMsg || ''))) setActionError('暂时无法拨打，请复制电话联系管理员')
            })
          }}>拨打</Text><Text className={styles.textLink} onClick={() => copy(account.contact_phone)}>复制</Text></View>
        </View>}
        {account.contact_wechat && <View className={styles.contactRow}><View><Text className={styles.cardLabel}>联系微信</Text><Text className={styles.contactValue}>{account.contact_wechat}</Text></View><Text className={styles.textLink} onClick={() => copy(account.contact_wechat)}>复制</Text></View>}
        {account.service_hours && <Text className={styles.serviceHours}>服务时间：{account.service_hours}</Text>}
      </View>}
      <Text className={styles.homeLink} onClick={returnHome}>返回首页</Text>
    </View>
  </View></AuthGuard>
}
