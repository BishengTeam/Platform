import { useState } from 'react'
import { Text, View } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { OfflinePaymentPanel } from '@/components/OfflinePaymentPanel'
import { getOrderDetail } from '@/services/dataService'
import type { OrderDetail } from '@/types/orders'
import styles from './confirm.module.scss'

export default function ConfirmPage() {
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useLoad(options => {
    const id = Number(options?.order_id)
    if (!Number.isSafeInteger(id) || id <= 0) { setError('订单不存在'); setLoading(false); return }
    getOrderDetail(id).then(setOrder).catch(reason => setError(reason instanceof Error ? reason.message : '订单加载失败，请返回订单页重试')).finally(() => setLoading(false))
  })
  return <AuthGuard><View className={styles.page}><PageHeader title='线下付款' shouldShowBack />
    {order?.paymentChannel === 'bank_transfer' ? <OfflinePaymentPanel orderId={order.numericId} title={order.productTitle} />
      : <View className={styles.body}><Text>{loading ? '加载中…' : error || (order?.status === 'paid' || order?.status === 'completed' ? '付款已确认，请在报名详情查看后续审核进度' : '原支付渠道订单请联系管理员核实，请勿重复转账')}</Text></View>}
  </View></AuthGuard>
}
