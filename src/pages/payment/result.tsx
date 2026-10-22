import { OFFLINE_PAYMENT_LABELS as labels } from '@/utils/offlinePayment'
import { useState, useCallback } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { getOrderDetail } from '@/services/dataService'
import type { OrderDetail } from '@/types/orders'
import styles from './result.module.scss'

export default function ResultPage() {
  const [orderId, setOrderId] = useState(0)
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(async (id: number) => {
    try { setOrder(await getOrderDetail(id)); setError('') } catch (reason) { setError(reason instanceof Error ? reason.message : '进度获取失败，请重试') }
  }, [])
  useLoad(options => { const id = Number(options?.order_id); if (Number.isSafeInteger(id) && id > 0) { setOrderId(id); void load(id) } else setError('订单不存在') })
  const confirmed = order?.status === 'paid' || order?.status === 'completed'
  const title = !order ? error ? '暂时无法获取付款进度' : '正在核实付款进度…' : order.paymentStatusLabel || (order.offlineStatus === 'exception' ? labels.exception : order.status === 'refunded' ? labels.refunded : confirmed ? '付款已确认' : order.status === 'closed' ? '订单已关闭' : labels[order.offlineStatus || ''] || '请查看订单进度')
  return <AuthGuard><View className={styles.page}><PageHeader title='付款进度' shouldShowBack={false} /><View className={styles.body}>
    <Text className={styles.title}>{title}</Text><Text className={styles.desc}>{confirmed ? '认证报名继续进行资料审核，请在报名详情查看进度。' : '上传凭证不代表到账，付款状态以管理员核账结果为准。'}</Text>
    {order && <View className={styles.orderCard}><Text className={styles.cardValue}>{order.productTitle}</Text><Text className={styles.cardValueSm}>{order.outTradeNo}</Text><Text className={styles.cardValuePrice}>应付 ¥{order.amountPaid}</Text></View>}
    {error && <Text className={styles.desc}>{error}</Text>}<View className={styles.actions}>
      <Button onClick={() => void load(orderId)} disabled={!orderId}>刷新进度</Button>
      <Button variant='gradient' onClick={() => void Taro.reLaunch({ url: `/pages/order-detail/index?order_id=${orderId}` })} disabled={!orderId}>查看订单</Button>
      <Button variant='secondary' onClick={() => void Taro.switchTab({ url: '/pages/index/index' })}>返回首页</Button>
    </View></View></View></AuthGuard>
}
