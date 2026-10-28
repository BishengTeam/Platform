import { useCallback, useEffect, useRef, useState } from 'react'
import { Image, Picker, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { Button } from '@/components/Button'
import { FormInput } from '@/components/FormInput'
import { RegistrationSubmitBar, RequirementDisclosure } from '@/components/RegistrationParts'
import { offlinePaymentService, paymentRequestKey, transferCents, type OfflinePayment, type PaymentMaterial } from '@/services/offlinePayment'
import { pointsMallService, applyCouponToOrder, type UsableCoupon } from '@/services/pointsMallService'
import { cancelOrder } from '@/services/dataService'
import { ROUTES } from '@/constants/routes'
import { beijingTransferParts, formatTransferTime, transferDeadline } from '@/utils/offlinePayment'
import styles from './index.module.scss'

const messageOf = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback
const emptyForm = { payer: '', date: '', time: '', amount: '', bank_reference: '', note: '' }

function PaymentProof({ orderId, material, index, localPath, busy, onPreview, onReplace, onRemove }: {
  orderId: number; material: PaymentMaterial; index: number; localPath?: string; busy: boolean
  onPreview: (path?: string) => void; onReplace?: () => void; onRemove?: () => void
}) {
  const isImage = material.content_type.startsWith('image/')
  const [path, setPath] = useState(localPath || '')
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setFailed(false)
    setPath(localPath || '')
    if (isImage && !localPath) {
      void offlinePaymentService.downloadMaterial(orderId, material).then(value => {
        if (active) setPath(value)
      }).catch(() => { if (active) setFailed(true) })
    }
    return () => { active = false }
  }, [orderId, material.id, isImage, localPath, retry])
  return <View className={styles.proofCard}>
    <View className={styles.proofPreview} onClick={() => {
      if (busy) return
      if (failed) setRetry(value => value + 1)
      else onPreview(path || undefined)
    }}>
      {isImage && path && !failed
        ? <Image className={styles.proofImage} src={path} mode='aspectFit' onError={() => setFailed(true)} />
        : <View className={styles.proofPlaceholder}><Text className={styles.proofType}>{isImage ? failed ? '重试' : '图片' : 'PDF'}</Text>
          <Text className={styles.proofCaption}>{isImage ? failed ? '缩略图加载失败，点击重试' : '正在加载缩略图…' : '点击查看文件'}</Text></View>}
      {isImage && path && !failed && <Text className={styles.proofOverlay}>点击预览</Text>}
    </View>
    <View className={styles.proofMeta}><Text className={styles.proofName}>凭证 {index + 1}</Text><Text className={styles.proofCaption}>{Math.max(1, Math.ceil(material.size_bytes / 1024))} KB</Text></View>
    {(onReplace || onRemove) && <View className={styles.proofActions}>
      {onReplace && <Text className={styles.transferLink} onClick={() => { if (!busy) onReplace() }}>替换</Text>}
      {onRemove && <Text className={styles.removeLink} onClick={() => { if (!busy) onRemove() }}>移除</Text>}
    </View>}
  </View>
}

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
  const [clock, setClock] = useState(() => Date.now())
  const [accountExpanded, setAccountExpanded] = useState<boolean | null>(null)
  const [orderExpanded, setOrderExpanded] = useState(false)
  const [contactExpanded, setContactExpanded] = useState(false)
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [extraExpanded, setExtraExpanded] = useState(false)
  const [couponExpanded, setCouponExpanded] = useState(false)
  const [localPaths, setLocalPaths] = useState<Record<number, string>>({})
  const lock = useRef(false)
  const dirty = useRef(false)
  const version = useRef(0)
  const request = useRef<{ fingerprint: string; key: string } | null>(null)
  const firstShow = useRef(true)
  const refreshedDeadline = useRef('')
  const load = useCallback(async () => {
    try {
      const data = await offlinePaymentService.detail(orderId)
      setPayment(data)
      if (!dirty.current) {
        version.current = data.current_version
        const latest = data.submissions[0]
        if (latest) {
          const time = beijingTransferParts(latest.transfer_time)
          setForm({ payer: latest.payer, amount: (latest.amount_cents / 100).toFixed(2),
            date: time?.date || '', time: time?.time || '', bank_reference: latest.bank_reference, note: latest.note })
          setMaterials(data.materials.filter(m => latest.material_ids.includes(m.id)))
        } else { setForm(emptyForm); setMaterials([]) }
      }
      setError(dirty.current && data.current_version !== version.current ? '凭证版本已变化，请重新载入最新信息后再提交。' : '')
    } catch (reason) { setError(messageOf(reason, '付款信息加载失败，请重试')) }
    finally { setLoading(false) }
  }, [orderId])
  useEffect(() => { void load() }, [load])
  useDidShow(() => {
    setClock(Date.now())
    if (firstShow.current) { firstShow.current = false; return }
    void load()
  })
  useEffect(() => {
    if (!payment?.deadline || !['awaiting_proof', 'returned'].includes(payment.status)) return
    const end = new Date(payment.deadline).getTime()
    if (!Number.isFinite(end)) return
    setClock(Date.now())
    const timer = setInterval(() => setClock(Date.now()), 30000)
    const timeout = setTimeout(() => {
      setClock(Date.now())
      if (Date.now() < end) return
      const key = `${orderId}:${payment.deadline}`
      if (refreshedDeadline.current !== key) { refreshedDeadline.current = key; void load() }
    }, Math.min(2147483647, Math.max(0, end - Date.now())))
    return () => { clearInterval(timer); clearTimeout(timeout) }
  }, [orderId, payment?.deadline, payment?.status, load])
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
      if (file.content_type.startsWith('image/')) setLocalPaths(previous => ({ ...previous, [file.id]: path }))
      dirty.current = true
      setMaterials(previous => { const next = [...previous]; next[index] = file; return next })
      setErrors(previous => ({ ...previous, materials: '' }))
    } catch (reason) { setErrors(previous => ({ ...previous, materials: messageOf(reason, '凭证上传失败，请重试') })) }
  })
  const submit = () => void run(async () => {
    if (!payment) return
    if (!editable) { await load(); return }
    if (payment.amount_cents === 0) { await offlinePaymentService.free(orderId); await Taro.navigateTo({ url: `/pages/payment/result?order_id=${orderId}` }); return }
    const nextErrors: Record<string, string> = {}
    if (!materials.length) nextErrors.materials = '请上传转账凭证'
    if (!form.payer.trim()) nextErrors.payer = '请填写转账人或付款单位'
    const cents = transferCents(form.amount)
    if (cents === null) nextErrors.amount = '请填写正确的转账金额，最多两位小数'
    if (!form.date) nextErrors.date = '请选择转账日期'
    if (!form.time) nextErrors.time = '请选择转账时间'
    const transferTime = new Date(`${form.date}T${form.time}:00+08:00`)
    if (form.date && form.time && (!Number.isFinite(transferTime.getTime()) || transferTime.getTime() > Date.now() + 300000)) nextErrors.date = '转账时间不能晚于当前时间'
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
  const deadline = transferDeadline(payment.deadline, payment.status, clock)
  const editable = (payment.can_submit && !deadline?.expired) || (exceptionForm && payment.can_report_exception)
  const canChangeCoupon = payment.can_change_coupon && !deadline?.expired
  const confirmed = payment.status === 'confirmed' || ['paid', 'completed'].includes(payment.order_status)
  const showAccount = accountExpanded ?? (payment.status === 'awaiting_proof' && !deadline?.expired)
  const latest = payment.submissions[0]
  const statusTitle = confirmed ? '付款已确认' : payment.amount_cents === 0 && editable ? '确认零元报名'
    : payment.status === 'awaiting_proof' ? deadline?.expired ? '提交时间已截止' : '待转账并提交凭证'
      : payment.status === 'returned' ? '转账凭证需要补交' : payment.status_label
  const hint = confirmed ? '核账已通过，后续审核进度请在报名详情查看。'
    : payment.status === 'under_review' ? '凭证已收到，请等待管理员核账，请勿重复转账。'
      : payment.status === 'returned' ? '请按退回原因补交凭证，无需重复转账。'
        : payment.status === 'refunded' ? '退款情况请查看订单记录或联系管理员核实。'
          : payment.status === 'closed' || payment.status === 'exception' || deadline?.expired ? '如已转账，请申报异常或联系管理员核实，请勿重复转账。'
            : payment.amount_cents === 0 ? '本单无需银行转账，确认后继续办理报名。' : '请核对收款账户，转账后填写信息并上传凭证。'
  const reason = payment.status === 'returned' ? payment.message || latest?.reason : payment.message
  const field = (key: keyof typeof form, label: string, required = false) => <View id={`transfer-${key}`}><FormInput compact label={label} required={required} value={form[key]} type={key === 'amount' ? 'digit' : 'text'} placeholder={`请填写${label}`} maxlength={key === 'note' ? 1000 : 128} disabled={busy}
    error={errors[key] ? { valid: false, message: errors[key] } : undefined} onChange={value => update(key, value)} /></View>
  const row = (label: string, value: string, copying = false) => <View className={styles.transferRow}><View className={styles.rowContent}><Text className={styles.transferLabel}>{label}</Text><Text className={styles.transferValue}>{value || '—'}</Text></View>{copying && value && <Text className={styles.copyButton} onClick={() => copy(value)}>复制{label}</Text>}</View>
  const proof = (material: PaymentMaterial, index: number, editing = false) => <PaymentProof key={material.id} orderId={orderId} material={material} index={index} localPath={localPaths[material.id]} busy={busy}
    onPreview={path => void run(() => offlinePaymentService.preview(orderId, material, path))}
    onReplace={editing ? () => upload(index) : undefined}
    onRemove={editing ? () => {
      if (lock.current) return
      dirty.current = true
      setMaterials(previous => previous.filter((_, i) => i !== index))
    } : undefined} />
  return <View className={styles.transferPanel}>
    <View className={`${styles.summaryCard} ${confirmed ? styles.summaryConfirmed : ''}`}>
      <View className={styles.summaryTop}><Text className={styles.channelTag}>银行转账</Text><Text className={styles.transferLink} onClick={() => void run(load)}>{busy ? '处理中…' : '刷新进度'}</Text></View>
      <Text className={`${styles.statusTitle} ${confirmed ? styles.successText : ''}`}>{statusTitle}</Text>
      <Text className={styles.amountLabel}>{confirmed ? '订单金额' : '应付金额'}</Text>
      <View className={styles.amount}><Text className={styles.currency}>¥</Text><Text>{(payment.amount_cents / 100).toFixed(2)}</Text></View>
      <Text className={styles.productTitle}>{title || payment.product_type}</Text>
      <Text className={styles.transferHint}>{hint}</Text>
      {deadline && payment.amount_cents > 0 && <View className={`${styles.deadlineNotice} ${styles[`deadline_${deadline.tone}`]}`}>
        <View className={styles.deadlineHeading}><Text className={styles.deadlineIcon}>!</Text><Text className={styles.deadlineTitle}>{deadline.title}</Text></View>
        <Text className={styles.deadlineExact}>{deadline.exact}</Text>
      </View>}
      {reason && <View className={styles.reasonNotice}><Text className={styles.reasonTitle}>{payment.status === 'returned' ? '退回原因' : '处理说明'}</Text><Text className={styles.reasonText}>{reason}</Text></View>}
      {(canChangeCoupon || payment.coupon_code) && <View className={styles.couponSection}>
        <View className={styles.compactRow} onClick={() => {
          if (!canChangeCoupon || busy) return
          if (couponExpanded) { setCouponExpanded(false); return }
          void run(async () => {
            setCoupons(await pointsMallService.usableCoupons({ order_amount_cents: payment.amount_cents, product_type: payment.product_type, product_category: 'certification' }))
            setCouponExpanded(true)
          })
        }}><Text className={styles.transferLabel}>优惠券</Text><Text className={styles.couponLabel}>{payment.coupon_code ? payment.original_price != null && payment.original_price > payment.amount_cents ? `已优惠 ¥${((payment.original_price - payment.amount_cents) / 100).toFixed(2)}` : '已使用优惠券' : '未使用'}{canChangeCoupon ? couponExpanded ? ' ⌃' : ' ›' : ''}</Text></View>
        {canChangeCoupon && couponExpanded && <View className={styles.expandedContent}>
          <Text className={styles.transferHint}>请在转账前选好优惠券，提交凭证后金额固定。</Text>
          {payment.coupon_code && <Text className={styles.transferLink} onClick={() => void run(async () => { await applyCouponToOrder(orderId, ''); setCouponExpanded(false); await load() })}>移除已使用优惠券</Text>}
          {!coupons.length && <Text className={styles.transferHint}>暂无其他可用优惠券</Text>}
          {coupons.map(coupon => <View key={coupon.coupon_code} className={styles.couponOption} onClick={() => void run(async () => { await applyCouponToOrder(orderId, coupon.coupon_code); setCoupons([]); setCouponExpanded(false); await load() })}>
            <Text className={styles.transferValue}>{coupon.name || coupon.coupon_code}</Text><Text className={styles.couponLabel}>使用后 ¥{(coupon.discounted_price_cents / 100).toFixed(2)}</Text>
          </View>)}
        </View>}
      </View>}
      <View className={styles.orderToggle} onClick={() => setOrderExpanded(value => !value)}><Text>订单详情</Text><Text>{orderExpanded ? '收起 ⌃' : '展开 ›'}</Text></View>
      {orderExpanded && <View className={styles.expandedContent}>{row('订单号', payment.out_trade_no, true)}{row('付款进度', payment.status_label)}</View>}
      {confirmed && <Button variant='gradient' onClick={() => void Taro.navigateTo({ url: `/${ROUTES.MINE_REGISTRATIONS}` })}>查看报名进度</Button>}
    </View>
    {payment.amount_cents > 0 && <View className={styles.transferCard}>
      <View className={styles.sectionHead} onClick={() => setAccountExpanded(!showAccount)}><View className={styles.sectionHeading}><Text className={styles.stepNumber}>1</Text><Text className={styles.transferTitle}>银行收款账户</Text></View><Text className={styles.toggleLabel}>{showAccount ? '收起 ⌃' : '查看 ›'}</Text></View>
      {showAccount && <View className={styles.expandedContent}>
        {row('收款户名', payment.account.account_name, true)}{row('开户行', payment.account.bank_name)}
        <View className={styles.accountNumberBox}><Text className={styles.transferLabel}>银行账号</Text><Text className={styles.accountNumber}>{payment.account.account_number.replace(/\s/g, '').replace(/(.{4})(?=.)/g, '$1 ') || '—'}</Text><Text className={styles.copyButton} onClick={() => copy(payment.account.account_number)}>复制银行账号</Text></View>
        {row('转账备注', payment.out_trade_no, true)}
        {payment.account.transfer_note && <Text className={styles.transferHint}>{payment.account.transfer_note}</Text>}
        {!editable && <Text className={styles.transferHint}>账户仅供核对，请勿重复转账。</Text>}
      </View>}
    </View>}
    {editable && payment.amount_cents > 0 && <View className={styles.transferCard}>
      <View className={styles.sectionHeading}><Text className={styles.stepNumber}>2</Text><Text className={styles.transferTitle}>{exceptionForm ? '申报已转账异常' : payment.status === 'returned' ? '补交转账凭证' : '提交转账凭证'}</Text></View>
      <View id='transfer-materials' className={styles.materialSection}>
        <Text className={styles.transferLabel}>转账凭证 <Text className={styles.required}>*</Text></Text>
        <Text className={styles.transferHint}>至少上传 1 份银行转账回单，需包含收款账号、金额和时间。</Text>
        <View className={styles.proofGrid}>
          {materials.map((material, index) => proof(material, index, true))}
          {materials.length < 3 && <View className={styles.uploadTile} onClick={() => { if (!busy) upload(materials.length) }}><Text className={styles.uploadPlus}>＋</Text><Text className={styles.uploadTitle}>{busy ? '处理中…' : materials.length ? '添加凭证' : '上传转账凭证'}</Text><Text className={styles.proofCaption}>图片或 PDF</Text></View>}
        </View>
        <Text className={styles.uploadHint}>JPG、PNG、PDF，单个不超过 10 MB，最多 3 份。</Text>
        {errors.materials && <Text className={styles.transferError}>{errors.materials}</Text>}
      </View>
      {field('payer', '转账人／付款单位', true)}
      {field('amount', '实际转账金额（元）', true)}
      <View className={styles.transferGrid}>{(['date', 'time'] as const).map(key => <View key={key} id={`transfer-${key}`}><Text className={styles.transferLabel}>{key === 'date' ? '转账日期 *' : '转账时间 *'}</Text>
        <Picker mode={key} value={form[key]} disabled={busy} onChange={e => update(key, e.detail.value)}><View className={styles.transferPicker}>{form[key] || '请选择'}</View></Picker>
        {errors[key] && <Text className={styles.transferError}>{errors[key]}</Text>}</View>)}</View>
      <Text className={styles.uploadHint}>日期和时间请按北京时间填写。</Text>
      <View className={styles.extraToggle} onClick={() => setExtraExpanded(value => !value)}><Text>补充信息（选填）</Text><Text>{extraExpanded ? '收起 ⌃' : '展开 ›'}</Text></View>
      {extraExpanded && <View>{field('bank_reference', '银行流水号')}{field('note', '补充说明')}</View>}
    </View>}
    {!editable && latest && <View className={styles.transferCard}><Text className={styles.transferTitle}>本次提交</Text><Text className={styles.latestAmount}>¥{(latest.amount_cents / 100).toFixed(2)}</Text>
      <Text className={styles.transferHint}>{latest.payer} · {formatTransferTime(latest.transfer_time)}</Text>
      <View className={styles.proofGrid}>{latest.material_ids.map((id, index) => { const material = payment.materials.find(item => item.id === id); return material ? proof(material, index) : null })}</View>
    </View>}
    {payment.can_report_exception && !exceptionForm && <Button variant='secondary' disabled={busy} onClick={() => setExceptionForm(true)}>已转账？申报异常</Button>}
    <View className={styles.supportCard}>
      <View className={styles.supportRow} onClick={() => setContactExpanded(value => !value)}><Text className={styles.supportLabel}>联系管理员</Text><Text className={styles.toggleLabel}>{contactExpanded ? '收起 ⌃' : '付款遇到问题？ ›'}</Text></View>
      {contactExpanded && <View className={styles.supportContent}>
        {row('联系人', payment.account.contact_name)}
        {payment.account.contact_phone && <View>{row('联系电话', payment.account.contact_phone, true)}<Button variant='secondary' size='sm' onClick={() => void Taro.makePhoneCall({ phoneNumber: payment.account.contact_phone }).catch(reason => {
          if (!/cancel/i.test(String(reason?.errMsg || ''))) setError('暂时无法拨打，请复制电话联系管理员')
        })}>拨打电话</Button></View>}
        {payment.account.contact_wechat && row('微信号', payment.account.contact_wechat, true)}
        {payment.account.service_hours && <Text className={styles.transferHint}>服务时间：{payment.account.service_hours}</Text>}
      </View>}
      {!!payment.submissions.length && <View>
        <View className={styles.supportRow} onClick={() => setHistoryExpanded(value => !value)}><Text className={styles.supportLabel}>凭证提交记录</Text><Text className={styles.toggleLabel}>{historyExpanded ? '收起 ⌃' : `共 ${payment.submissions.length} 次 ›`}</Text></View>
        {historyExpanded && <View className={styles.supportContent}>{payment.submissions.map((submission, index) => <RequirementDisclosure key={submission.version} title={`${index === 0 ? '最新' : '历史'}提交 · 第 ${submission.version} 版`}>
          {row('转账人', submission.payer)}{row('申报金额', `¥${(submission.amount_cents / 100).toFixed(2)}`)}{row('转账时间', formatTransferTime(submission.transfer_time))}
          {submission.bank_reference && row('银行流水号', submission.bank_reference)}{submission.note && row('补充说明', submission.note)}
          {submission.reason && <Text className={styles.transferError}>{submission.reason}</Text>}
          <View className={styles.proofGrid}>{submission.material_ids.map((id, i) => { const material = payment.materials.find(item => item.id === id); return material ? proof(material, i) : null })}</View>
        </RequirementDisclosure>)}</View>}
      </View>}
      {payment.can_cancel && <View className={styles.supportRow} onClick={() => void run(async () => {
        const result = await Taro.showModal({ title: '取消订单', content: '仅在确认尚未转账时取消。已转账请联系管理员核实。', confirmText: '未转账，取消' })
        if (result.confirm) { await cancelOrder(orderId); await load() }
      })}><Text className={styles.cancelLabel}>尚未转账，取消订单</Text><Text className={styles.toggleLabel}>›</Text></View>}
    </View>
    {error && <View className={styles.transferCard}><Text className={styles.transferError}>{error}</Text>
      <Button variant='secondary' disabled={busy} onClick={() => void run(async () => {
        dirty.current = false; request.current = null; await load()
      })}>重新载入（舍弃未提交信息）</Button>
    </View>}
    {(editable || (canChangeCoupon && payment.amount_cents === 0)) && <RegistrationSubmitBar priceLabel='应付金额' priceCents={payment.amount_cents}
      label={payment.amount_cents === 0 ? '确认零元报名' : exceptionForm ? '提交异常申报' : payment.status === 'returned' ? '重新提交凭证' : '提交转账凭证'} loading={busy} disabled={busy} onSubmit={submit} />}
  </View>
}
