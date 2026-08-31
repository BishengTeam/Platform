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

const TYPE_DESCRIPTIONS: Record<H3cRegistrationType, string> = {
  coupon: '参加新华三大赛获奖、持有厂商赠送考券的考生',
  student: '学生身份享受补贴，需提交学生证明材料',
  full: '无优惠券的社会考生，按全额缴费报名',
}

interface H3cFieldDef {
  key: string
  label: string
  required?: boolean
  placeholder: string
  remark?: string
}

const BASE_FIELDS: H3cFieldDef[] = [
  { key: 'candidate_name', label: '姓名', required: true, placeholder: '如：王小二' },
  { key: 'gender', label: '性别', required: true, placeholder: '男 / 女', remark: '可选值：男、女' },
  { key: 'candidate_idcard', label: '身份证号', required: true, placeholder: '请输入身份证号', remark: '18位居民身份证号码' },
  { key: 'school', label: '单位/学校', required: true, placeholder: '请输入学校或单位全称' },
  { key: 'address', label: '通信地址', required: true, placeholder: '请输入详细通信地址' },
  { key: 'phone', label: '手机号', required: true, placeholder: '如：188XXXX8888' },
  { key: 'email', label: '邮箱', required: true, placeholder: '如：wxe@XX.com' },
  { key: 'education', label: '学历', required: true, placeholder: '如：本科', remark: '可选：本科 / 中职 / 高职 / 硕士 / 博士' },
  { key: 'first_name_en', label: 'First Name', required: true, placeholder: '如：Xiaoer', remark: '官方模板示例：王小二 → Xiaoer' },
  { key: 'last_name_en', label: 'Last Name', required: true, placeholder: '如：Wang', remark: '官方模板示例：王小二 → Wang' },
]

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
    if (BASE_FIELDS.some((field) => !form[field.key])) {
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
            <Text className={styles.desc}>{TYPE_DESCRIPTIONS[type]}</Text>
            <View className={styles.row}>
              <Text className={styles.label}>应付金额</Text>
              <Text className={styles.price}>{(price / 100).toFixed(2)} 元</Text>
            </View>
          </View>

          <View className={styles.card}>
            <Text className={styles.title}>基础信息</Text>
            <Text className={styles.remark}>带 * 为必填项，填写内容与官方报名模板保持一致</Text>
            {BASE_FIELDS.map((field) => (
              <View key={field.key} className={styles.field}>
                <View className={styles.labelRow}>
                  {field.required && <Text className={styles.required}>*</Text>}
                  <Text className={styles.label}>{field.label}</Text>
                </View>
                <Input
                  className={styles.input}
                  placeholder={field.placeholder}
                  placeholderClass={styles.placeholder}
                  value={form[field.key]}
                  onInput={(event) => update(field.key, event.detail.value)}
                />
                {field.remark && <Text className={styles.remark}>{field.remark}</Text>}
              </View>
            ))}
          </View>

          {type === 'coupon' && (
            <View className={styles.card}>
              <Text className={styles.title}>考券材料</Text>
              <View className={styles.field}>
                <View className={styles.labelRow}>
                  <Text className={styles.required}>*</Text>
                  <Text className={styles.label}>考券号</Text>
                </View>
                <Input
                  className={styles.input}
                  placeholder='请输入考券号'
                  placeholderClass={styles.placeholder}
                  value={form.coupon_code}
                  onInput={(event) => update('coupon_code', event.detail.value)}
                />
                <Text className={styles.remark}>参加新华三大赛获奖、由厂商赠送的考券号</Text>
              </View>
              <View className={styles.uploadBox} onClick={() => chooseMaterial('coupon_proof')}>
                <Text className={couponKey ? styles.uploaded : ''}>{couponKey ? '优惠券证明已上传' : '上传 JPG 优惠券证明'}</Text>
              </View>
              <Text className={styles.remark}>学生/内部员工优惠券需提供证明图片，JPG 格式</Text>
            </View>
          )}

          {type === 'student' && (
            <View className={styles.card}>
              <Text className={styles.title}>学生材料</Text>
              <View className={styles.field}>
                <View className={styles.labelRow}>
                  <Text className={styles.required}>*</Text>
                  <Text className={styles.label}>学信网在线验证码</Text>
                </View>
                <Input
                  className={styles.input}
                  placeholder='请输入学信网在线验证码'
                  placeholderClass={styles.placeholder}
                  value={form.verify_code}
                  onInput={(event) => update('verify_code', event.detail.value)}
                />
                <Text className={styles.remark}>必须提供，且需与学生证明图片同时提交</Text>
              </View>
              <View className={styles.uploadBox} onClick={() => chooseMaterial('student_proof')}>
                <Text className={studentKey ? styles.uploaded : ''}>{studentKey ? '学生证明已上传' : '上传 JPG 学生证明'}</Text>
              </View>
              <Text className={styles.remark}>如无学信网在线验证码，请上传有学院盖章的学籍证明图片；如提供验证码，请上传身份证人像一面清晰图片，JPG 格式</Text>
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
