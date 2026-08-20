import { useEffect, useState } from 'react'
import { Input, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { h3cService } from '@/services/h3cService'
import { ROUTES } from '@/constants/routes'
import type { H3cExamBatch, H3cProfileDefaults, H3cRegistrationType } from '@/types/h3c'
import styles from './h3c.module.scss'

const TYPE_LABELS: Record<H3cRegistrationType, string> = {
  coupon: '考券报名',
  student: '学生报名',
  full: '全额报名',
}

const FIELDS = [
  ['candidate_name', '姓名'],
  ['gender', '性别'],
  ['candidate_idcard', '身份证号'],
  ['school', '单位/学校'],
  ['address', '通信地址'],
  ['phone', '手机号'],
  ['email', '邮箱'],
  ['education', '学历'],
  ['first_name_en', 'First Name'],
  ['last_name_en', 'Last Name'],
] as const

export default function H3CFormPage() {
  const [batchId, setBatchId] = useState(0)
  const [batch, setBatch] = useState<H3cExamBatch | null>(null)
  const [type, setType] = useState<H3cRegistrationType>('full')
  const [form, setForm] = useState<Record<string, string>>({
    candidate_name: '', gender: '', candidate_idcard: '', school: '', address: '',
    phone: '', email: '', education: '', first_name_en: '', last_name_en: '',
    coupon_code: '', verify_code: '',
  })
  const [couponKey, setCouponKey] = useState('')
  const [studentKey, setStudentKey] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useLoad((options) => setBatchId(Number(options?.batch_id || 0)))

  useEffect(() => {
    h3cService.profileDefaults().then((data: H3cProfileDefaults) => {
      setForm((old) => ({
        ...old,
        candidate_name: data.candidate_name || '',
        gender: data.gender || '',
        candidate_idcard: data.candidate_idcard || '',
        school: data.school || '',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        education: data.education || '',
        first_name_en: data.first_name_en || '',
        last_name_en: data.last_name_en || '',
      }))
    })
  }, [])

  useEffect(() => {
    if (!batchId) return
    h3cService.listBatches().then((batches) => setBatch(batches.find((item) => item.id === batchId) || null))
  }, [batchId])

  const update = (key: string, value: string) => setForm((old) => ({ ...old, [key]: value }))

  const chooseMaterial = async (materialType: 'coupon_proof' | 'student_proof') => {
    const result = await Taro.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
    const filePath = result.tempFilePaths[0]
    if (!filePath || !batchId) return
    Taro.showLoading({ title: '上传中', mask: true })
    try {
      const uploaded = await h3cService.uploadMaterial(filePath, batchId, materialType)
      if (materialType === 'coupon_proof') setCouponKey(uploaded.storage_key)
      else setStudentKey(uploaded.storage_key)
      Taro.showToast({ title: '上传成功', icon: 'success' })
    } finally {
      Taro.hideLoading()
    }
  }

  const submit = async () => {
    if (!batch || submitting) return
    if (FIELDS.some(([key]) => !form[key])) {
      Taro.showToast({ title: '请完整填写报名信息', icon: 'none' })
      return
    }
    if (type === 'coupon' && (!form.coupon_code || !couponKey)) {
      Taro.showToast({ title: '请上传优惠券证明', icon: 'none' })
      return
    }
    if (type === 'student' && (!form.verify_code || !studentKey)) {
      Taro.showToast({ title: '请上传学生证明', icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      const registration = await h3cService.createOrder({
        batch_id: batch.id,
        registration_type: type,
        candidate_name: form.candidate_name,
        gender: form.gender,
        candidate_idcard: form.candidate_idcard,
        school: form.school,
        address: form.address,
        phone: form.phone,
        email: form.email,
        education: form.education,
        first_name_en: form.first_name_en,
        last_name_en: form.last_name_en,
        coupon_code: type === 'coupon' ? form.coupon_code : null,
        verify_code: type === 'student' ? form.verify_code : null,
        coupon_proof_key: type === 'coupon' ? couponKey : null,
        student_proof_key: type === 'student' ? studentKey : null,
      })
      if (registration.price_cents === 0) {
        Taro.navigateTo({ url: `/${ROUTES.PAYMENT_RESULT}?order_id=${registration.order_id}&status=success&cert_name=${encodeURIComponent(batch.name)}&price=0` })
      } else {
        Taro.navigateTo({ url: `/${ROUTES.REGISTRATION_CONFIRM}?order_id=${registration.order_id}` })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const price = batch?.prices.find((item) => item.registration_type === type)?.price_cents ?? 0

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='H3C 报名表单' shouldShowBack />
        <View className={styles.body}>
          <View className={styles.card}>
            <Text className={styles.title}>{batch?.name || '加载考试批次中...'}</Text>
          </View>

          <View className={styles.card}>
            <Text className={styles.title}>报名类型</Text>
            <View className={styles.grid}>
              {(Object.keys(TYPE_LABELS) as H3cRegistrationType[]).map((key) => (
                <View key={key} className={`${styles.typeButton} ${type === key ? styles.typeActive : ''}`} onClick={() => setType(key)}>
                  {TYPE_LABELS[key]}
                </View>
              ))}
            </View>
            <View className={styles.row}>
              <Text className={styles.label}>应付金额</Text>
              <Text className={styles.price}>{(price / 100).toFixed(2)} 元</Text>
            </View>
          </View>

          <View className={styles.card}>
            <Text className={styles.title}>基础信息</Text>
            {FIELDS.map(([key, label]) => (
              <View key={key} style={{ marginTop: 10 }}>
                <Text className={styles.label}>{label}</Text>
                <Input className={styles.input} value={form[key]} onInput={(event) => update(key, event.detail.value)} />
              </View>
            ))}
          </View>

          {type === 'coupon' && (
            <View className={styles.card}>
              <Text className={styles.title}>考券材料</Text>
              <View style={{ marginTop: 10 }}>
                <Text className={styles.label}>考券号</Text>
                <Input className={styles.input} value={form.coupon_code} onInput={(event) => update('coupon_code', event.detail.value)} />
              </View>
              <View className={styles.uploadBox} onClick={() => chooseMaterial('coupon_proof')}>
                <Text className={couponKey ? styles.uploaded : ''}>{couponKey ? '优惠券证明已上传' : '上传 JPG 优惠券证明'}</Text>
              </View>
            </View>
          )}

          {type === 'student' && (
            <View className={styles.card}>
              <Text className={styles.title}>学生材料</Text>
              <View style={{ marginTop: 10 }}>
                <Text className={styles.label}>学信网在线验证码</Text>
                <Input className={styles.input} value={form.verify_code} onInput={(event) => update('verify_code', event.detail.value)} />
              </View>
              <View className={styles.uploadBox} onClick={() => chooseMaterial('student_proof')}>
                <Text className={studentKey ? styles.uploaded : ''}>{studentKey ? '学生证明已上传' : '上传 JPG 学生证明'}</Text>
              </View>
            </View>
          )}

          <Button variant='gradient' size='lg' onClick={submit}>
            {submitting ? '提交中...' : `提交并支付 ${(price / 100).toFixed(2)} 元`}
          </Button>
        </View>
      </View>
    </AuthGuard>
  )
}
