import type { OrderDetail } from '../types/orders.ts'
import type { OfflinePayment } from '../services/offlinePayment.ts'
import { transferDeadline } from './offlinePayment.ts'

export interface PaymentProgressSnapshot { order: OrderDetail; payment: OfflinePayment | null }
type ProgressState = 'awaiting_proof' | 'under_review' | 'returned' | 'exception' | 'expired' | 'confirmed' | 'closed' | 'refunded' | 'unknown'
type ProgressAction = 'order' | 'registration' | 'contact'
const STATES: Record<ProgressState, { title: string; description: string; tone: 'waiting' | 'warning' | 'success' | 'neutral'; symbol: string; action: ProgressAction; actionLabel: string }> = {
  awaiting_proof: { title: '请完成转账并提交凭证', description: '转账后上传银行回单，管理员核对到账后继续办理报名。', tone: 'waiting', symbol: '↑', action: 'order', actionLabel: '前往付款' },
  under_review: { title: '凭证已提交，等待核账', description: '请勿重复转账，核账通过后继续进行报名资料审核。', tone: 'waiting', symbol: '…', action: 'order', actionLabel: '查看已提交凭证' },
  returned: { title: '转账凭证需要补交', description: '请按退回原因补交凭证，无需重复转账。', tone: 'warning', symbol: '!', action: 'order', actionLabel: '补交凭证' },
  exception: { title: '转账需要人工核实', description: '请联系管理员核对转账情况，处理结果以订单最新进度为准。', tone: 'warning', symbol: '!', action: 'contact', actionLabel: '联系管理员' },
  expired: { title: '凭证提交时间已截止', description: '如已转账，请前往订单处理异常或联系管理员，请勿重复转账。', tone: 'warning', symbol: '!', action: 'order', actionLabel: '查看订单处理' },
  confirmed: { title: '付款已确认', description: '付款环节已完成，请查看后续报名审核进度。', tone: 'success', symbol: '✓', action: 'registration', actionLabel: '查看报名进度' },
  closed: { title: '订单已关闭', description: '该订单已停止正常付款。如已转账，请联系管理员核实。', tone: 'neutral', symbol: '×', action: 'order', actionLabel: '查看订单详情' },
  refunded: { title: '款项已退回', description: '退款处理已完成，到账疑问请联系管理员核实。', tone: 'neutral', symbol: '↩', action: 'order', actionLabel: '查看退款订单' },
  unknown: { title: '付款状态待核实', description: '请查看订单详情或刷新进度，核实当前处理情况。', tone: 'neutral', symbol: '…', action: 'order', actionLabel: '查看订单详情' },
}

export function paymentProgress(snapshot: PaymentProgressSnapshot, now = Date.now()) {
  const { order, payment } = snapshot
  // The bank-detail read follows the order read and carries its own current order status.
  const orderStatus = payment?.order_status || order.status
  const offlineStatus = payment?.status || (order.paymentChannel === 'bank_transfer' ? order.offlineStatus : undefined)
  const deadline = payment ? transferDeadline(payment.deadline, payment.status, now) : null
  let state: ProgressState = 'unknown'
  if (orderStatus === 'refunded') state = 'refunded'
  else if (orderStatus === 'closed') state = offlineStatus === 'exception' ? 'exception' : 'closed'
  else if (orderStatus === 'paid' || orderStatus === 'completed') state = 'confirmed'
  else if (deadline?.expired) state = 'expired'
  else if (offlineStatus && ['awaiting_proof', 'under_review', 'returned', 'exception'].includes(offlineStatus)) state = offlineStatus as ProgressState
  const view = { state, ...STATES[state] }
  const amount = payment ? (payment.amount_cents / 100).toFixed(2) : order.amountPaid
  const zero = Number(amount) === 0
  const hasContact = Boolean(payment?.account.contact_phone || payment?.account.contact_wechat)
  if (state === 'awaiting_proof' && zero) {
    view.title = '请确认零元报名'; view.description = '本单无需银行转账，确认后继续办理报名。'; view.actionLabel = '确认零元报名'
  }
  if (state === 'expired' && payment?.status === 'returned') view.title = '补交凭证时间已截止'
  if (state === 'expired' && zero) { view.title = '零元报名确认时间已截止'; view.description = '请在订单详情核实是否仍可办理报名。' }
  if (!zero && ['closed', 'expired'].includes(state) && payment?.can_report_exception) view.actionLabel = '已转账，前往处理'
  if (view.action === 'contact' && !hasContact) { view.action = 'order'; view.actionLabel = '查看处理详情' }
  if (state === 'confirmed' && order.orderKind !== 'certification') {
    view.action = 'order'; view.actionLabel = '查看订单详情'; view.description = '付款环节已完成，请在订单详情查看后续办理情况。'
  }
  const reason = state === 'returned' ? payment?.message || payment?.submissions[0]?.reason
    : state === 'closed' ? order.closeReason || payment?.message : ['exception', 'expired'].includes(state) ? payment?.message : null
  return { ...view, amount, deadline: !zero ? deadline : null, reason: reason || null, hasContact,
    amountLabel: ['confirmed', 'closed', 'refunded'].includes(state) ? '订单金额' : '应付金额',
    poll: state === 'under_review' && order.paymentChannel === 'bank_transfer' }
}
