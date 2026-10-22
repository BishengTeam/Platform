import { useCallback, useEffect, useRef, useState } from 'react'
import { Picker, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Button } from '@/components/Button'
import { FormInput } from '@/components/FormInput'
import { MaterialItem, RegistrationSubmitBar, RegistrationSummary, RequirementDisclosure } from '@/components/RegistrationParts'
import { offlinePaymentService, paymentRequestKey, transferCents, type OfflinePayment, type PaymentMaterial } from '@/services/offlinePayment'
import { pointsMallService, applyCouponToOrder, type UsableCoupon } from '@/services/pointsMallService'
import { cancelOrder } from '@/services/dataService'
import styles from './index.module.scss'

const messageOf = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback
const emptyForm = { payer: '', date: '', time: '', amount: '', bank_reference: '', note: '' }

export function OfflinePaymentPanel({ orderId, title }: { orderId: number; title?: string }) {
  const [payment, setPayment] = useState<OfflinePayment | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [materials, setMaterials] = useState<PaymentMaterial[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [coupons, setCoupons] = useState<UsableCoupon[]>([])
  const [exceptionForm, setExceptionForm] = useState(false)
  const lock = useRef(false)
  const dirty = useRef(false)
  const version = useRef(0)
  const request = useRef<{ fingerprint: string; key: string } | null>(null)
  const load = useCallback(async () => {
    try {
      const data = await offlinePaymentService.detail(orderId)
      setPayment(data)
      if (!dirty.current) {
        version.current = data.current_version
        const latest = data.submissions[0]
        if (latest) {
          const time = new Date(latest.transfer_time)
          const pad = (value: number) => String(value).padStart(2, '0')
          setForm({ payer: latest.payer, amount: (latest.amount_cents / 100).toFixed(2),
            date: `${time.getFullYear()}-${pad(time.getMonth() + 1)}-${pad(time.getDate())}`,
            time: `${pad(time.getHours())}:${pad(time.getMinutes())}`, bank_reference: latest.bank_reference, note: latest.note })
          setMaterials(data.materials.filter(m => latest.material_ids.includes(m.id)))
        } else { setForm(emptyForm); setMaterials([]) }
      }
      setError(dirty.current && data.current_version !== version.current ? '凭证版本已变化，请重新载入最新信息后再提交。' : '')
    } catch (reason) { setError(messageOf(reason, '付款信息加载失败，请重试')) }
    finally { setLoading(false) }
  }, [orderId])
  useEffect(() => { void load() }, [load])
  async function run(action: () => Promise<void>) {
    if (lock.current) return
    lock.current = true; setBusy(true)
    try { await action() } catch (reason) {
      if (!/cancel/i.test(String((reason as { errMsg?: string })?.errMsg || ''))) setError(messageOf(reason, '操作未完成，请重试'))
    } finally { lock.current = false; setBusy(false) }
  }
  const update = (key: keyof typeof form, value: string) => {
    dirty.current = true
    setForm(previous => ({ ...previous, [key]: value }))
    setErrors(previous => ({ ...previous, [key]: '' }))
  }
  const copy = (value: string) => { void Taro.setClipboardData({ data: value }).catch(() => setError('复制失败，请重试')) }
  const upload = (index: number) => void run(async () => {
    const action = await Taro.showActionSheet({ itemList: ['相册或拍照（JPG、PNG）', '微信聊天文件（JPG、PNG、PDF）'] })
    let path: string
    if (action.tapIndex === 0) path = (await Taro.chooseImage({ count: 1 })).tempFilePaths[0]
    else path = (await Taro.chooseMessageFile({ count: 1, type: 'file', extension: ['jpg', 'jpeg', 'png', 'pdf'] })).tempFiles[0].path
    try {
      const file = await offlinePaymentService.upload(orderId, path)
      dirty.current = true
      setMaterials(previous => { const next = [...previous]; next[index] = file; return next })
      setErrors(previous => ({ ...previous, materials: '' }))
    } catch (reason) { setErrors(previous => ({ ...previous, materials: messageOf(reason, '凭证上传失败，请重试') })) }
  })
  const submit = () => void run(async () => {
    if (!payment) return
    if (payment.amount_cents === 0) { await offlinePaymentService.free(orderId); await Taro.navigateTo({ url: `/pages/payment/result?order_id=${orderId}` }); return }
    const nextErrors: Record<string, string> = {}
    if (!form.payer.trim()) nextErrors.payer = '请填写转账人或付款单位'
    if (!form.date) nextErrors.date = '请选择转账日期'
    if (!form.time) nextErrors.time = '请选择转账时间'
    const cents = transferCents(form.amount)
    if (cents === null) nextErrors.amount = '请填写正确的转账金额，最多两位小数'
    const transferTime = new Date(`${form.date}T${form.time}:00`)
    if (form.date && form.time && (!Number.isFinite(transferTime.getTime()) || transferTime.getTime() > Date.now() + 300000)) nextErrors.date = '转账时间不能晚于当前时间'
    if (!materials.length) nextErrors.materials = '请上传转账凭证'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      await Taro.pageScrollTo({ selector: `#transfer-${Object.keys(nextErrors)[0]}`, duration: 200 }); return
    }
    const body = { payer: form.payer.trim(), transfer_time: transferTime.toISOString(), amount_cents: cents,
      bank_reference: form.bank_reference.trim(), note: form.note.trim(), material_ids: materials.map(m => m.id), expected_version: version.current }
    const fingerprint = JSON.stringify(body)
    if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, key: paymentRequestKey() }
    await offlinePaymentService.submit(orderId, { ...body, request_key: request.current!.key }, exceptionForm)
    dirty.current = false
    await load()
    await Taro.navigateTo({ url: `/pages/payment/result?order_id=${orderId}` })
  })
  if (loading && !payment) return <View className={styles.transferPanel}><Text className={styles.transferHint}>正在加载付款信息…</Text></View>
  if (!payment) return <View className={styles.transferPanel}><Text className={styles.transferError}>{error || '付款信息不可用'}</Text><Button onClick={() => void run(load)}>重试</Button></View>
  const editable = payment.can_submit || (exceptionForm && payment.can_report_exception)
  const field = (key: keyof typeof form, label: string, required = false) => <View id={`transfer-${key}`}><FormInput compact label={label} required={required} value={form[key]} type={key === 'amount' ? 'digit' : 'text'} placeholder={`请填写${label}`} maxlength={key === 'note' ? 1000 : 128} disabled={busy}
    error={errors[key] ? { valid: false, message: errors[key] } : undefined} onChange={value => update(key, value)} /></View>
  const row = (label: string, value: string, copying = false) => <View className={styles.transferRow}><Text className={styles.transferLabel}>{label}</Text><Text className={styles.transferValue}>{value || '—'}</Text>{copying && value && <Text className={styles.transferLink} onClick={() => copy(value)}>复制{label}</Text>}</View>
  return <View className={styles.transferPanel}>
    <RegistrationSummary title={title || payment.product_type} badge='银行转账' priceCents={payment.amount_cents}
      items={[{ label: '订单号', value: payment.out_trade_no, wide: true }, { label: '付款进度', value: payment.status_label },
        ...(payment.deadline && ['awaiting_proof', 'returned'].includes(payment.status) ? [{ label: '提交截止', value: new Date(payment.deadline).toLocaleString(), wide: true }] : [])]}>
      {payment.message && <Text className={styles.transferError}>{payment.message}</Text>}
      <Text className={styles.transferHint}>{payment.amount_cents === 0 ? "本单无需转账，确认零元报名即可。" : "上传凭证后需等待核账；到账确认后继续进行报名资料审核。"}</Text>
      <Text className={styles.transferLink} onClick={() => void run(load)}>刷新进度</Text>
    </RegistrationSummary>
    {payment.can_change_coupon && <View className={styles.transferCard}><Text className={styles.transferTitle}>优惠券</Text>
      <Text className={styles.transferHint}>转账前选好优惠券，提交凭证后应付金额固定。</Text>
      {payment.coupon_code ? <Text className={styles.transferLink} onClick={() => void run(async () => { await applyCouponToOrder(orderId, ''); await load() })}>已使用 {payment.coupon_code} · 移除</Text>
        : <Text className={styles.transferLink} onClick={() => void run(async () => setCoupons(await pointsMallService.usableCoupons({ order_amount_cents: payment.amount_cents, product_type: payment.product_type, product_category: 'certification' })))}>查看可用优惠券</Text>}
      {coupons.map(coupon => <Text key={coupon.coupon_code} className={styles.transferLink} onClick={() => void run(async () => { await applyCouponToOrder(orderId, coupon.coupon_code); setCoupons([]); await load() })}>{coupon.coupon_code} · 使用后 ¥{(coupon.discounted_price_cents / 100).toFixed(2)}</Text>)}
    </View>}
    {payment.amount_cents > 0 && <View className={styles.transferCard}><Text className={styles.transferTitle}>收款账户</Text>
      {row('收款户名', payment.account.account_name, true)}{row('开户行', payment.account.bank_name, true)}{row('银行账号', payment.account.account_number, true)}
      {row('转账备注', payment.out_trade_no, true)}<Text className={styles.transferHint}>{payment.account.transfer_note}</Text>
    </View>}
    <View className={styles.transferCard}><Text className={styles.transferTitle}>联系管理员</Text>{row('联系人', payment.account.contact_name)}
      {payment.account.contact_phone && <View><Text className={styles.transferLink} onClick={() => void Taro.makePhoneCall({ phoneNumber: payment.account.contact_phone }).catch(reason => {
        if (!/cancel/i.test(String(reason?.errMsg || ''))) setError('暂时无法拨打，请复制电话联系管理员')
      })}>拨打 {payment.account.contact_phone}</Text><Text className={styles.transferLink} onClick={() => copy(payment.account.contact_phone)}>复制电话</Text></View>}
      {payment.account.contact_wechat && row('微信号', payment.account.contact_wechat, true)}<Text className={styles.transferHint}>{payment.account.service_hours}</Text>
    </View>
    {editable && payment.amount_cents > 0 && <View className={styles.transferCard}><Text className={styles.transferTitle}>{exceptionForm ? '申报已转账异常' : '转账信息'}</Text>
      {field('payer', '转账人／付款单位', true)}
      <View className={styles.transferGrid}>{(['date', 'time'] as const).map(key => <View key={key} id={`transfer-${key}`}><Text className={styles.transferLabel}>{key === 'date' ? '转账日期 *' : '转账时间 *'}</Text>
        <Picker mode={key} value={form[key]} disabled={busy} onChange={e => update(key, e.detail.value)}><View className={styles.transferPicker}>{form[key] || '请选择'}</View></Picker>
        {errors[key] && <Text className={styles.transferError}>{errors[key]}</Text>}</View>)}</View>
      {field('amount', '转账金额（元）', true)}{field('bank_reference', '银行流水号（有则填写）')}{field('note', '补充说明')}
      <View id='transfer-materials'>{Array.from({ length: Math.min(3, materials.length + 1) }, (_, index) => <MaterialItem key={index} title={`转账凭证${index + 1}`} required={index === 0} requirement='JPG、PNG、PDF，单个不超过 10 MB，最多 3 个附件。' disabled={busy} uploading={busy && !materials[index]}
        file={materials[index] ? { name: materials[index].filename, size: materials[index].size_bytes } : undefined} onUpload={() => upload(index)}>
        {materials[index] && <View className={styles.transferActions}><Text className={styles.transferLink} onClick={() => void run(() => offlinePaymentService.preview(orderId, materials[index]))}>查看凭证</Text>
          <Text className={styles.transferLink} onClick={() => { if (!lock.current) { dirty.current = true; setMaterials(previous => previous.filter((_, i) => i !== index)) } }}>移除</Text></View>}
      </MaterialItem>)}</View>{errors.materials && <Text className={styles.transferError}>{errors.materials}</Text>}
    </View>}
    {!!payment.submissions.length && <View className={styles.transferCard}><Text className={styles.transferTitle}>凭证提交记录</Text>
      {payment.submissions.map((submission, index) => <RequirementDisclosure key={submission.version} title={`${index === 0 ? '最新' : '历史'}提交 · 第 ${submission.version} 版`}>
        {row('转账人', submission.payer)}{row('申报金额', `¥${(submission.amount_cents / 100).toFixed(2)}`)}{row('转账时间', new Date(submission.transfer_time).toLocaleString())}
        {submission.reason && <Text className={styles.transferError}>{submission.reason}</Text>}
        {submission.material_ids.map(id => { const material = payment.materials.find(m => m.id === id); return material && <View key={id}><Text className={styles.transferLink} onClick={() => void run(() => offlinePaymentService.preview(orderId, material))}>{material.filename} · {Math.ceil(material.size_bytes / 1024)} KB</Text></View> })}
      </RequirementDisclosure>)}
    </View>}
    {payment.can_report_exception && !exceptionForm && <Button variant='secondary' disabled={busy} onClick={() => setExceptionForm(true)}>已转账？申报异常</Button>}
    {payment.can_cancel && <Text className={styles.transferLink} onClick={() => void run(async () => {
      const result = await Taro.showModal({ title: '取消订单', content: '仅在确认尚未转账时取消。已转账请联系管理员核实。', confirmText: '未转账，取消' })
      if (result.confirm) { await cancelOrder(orderId); await load() }
    })}>尚未转账，取消订单</Text>}
    {error && <View className={styles.transferCard}><Text className={styles.transferError}>{error}</Text>
      <Button variant='secondary' disabled={busy} onClick={() => void run(async () => {
        dirty.current = false; request.current = null; await load()
      })}>重新载入（舍弃未提交信息）</Button>
    </View>}
    {(editable || (payment.can_change_coupon && payment.amount_cents === 0)) && <RegistrationSubmitBar priceLabel='应付金额' priceCents={payment.amount_cents}
      label={payment.amount_cents === 0 ? '确认零元报名' : exceptionForm ? '提交异常申报' : payment.status === 'returned' ? '重新提交凭证' : '提交转账凭证'} loading={busy} disabled={busy} onSubmit={submit} />}
  </View>
}
