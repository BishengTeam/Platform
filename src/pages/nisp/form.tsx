import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Input, Picker } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { nispService } from '@/services/nispService'
import type { NispBatch, NispOrderCreatePayload } from '@/services/nispService'
import { ROUTES } from '@/constants/routes'
import styles from './nisp.module.scss'

const PROVINCES = [
  '北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江',
  '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南',
  '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州',
  '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆',
]

const EDUCATIONS = ['高中', '中专', '大专', '本科', '硕士', '博士']
const GENDERS = ['男', '女']

interface FormState {
  name: string; pinyin: string; major: string; school: string;
  id_card: string; phone: string; email: string; province: string;
  gender: string; age: string; education: string; address: string; zip_code: string;
}

export default function NispFormPage() {
  const [batchId, setBatchId] = useState(0)
  const [level, setLevel] = useState<'1' | '2'>('1')
  const [batch, setBatch] = useState<NispBatch | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<FormState>({
    name: '', pinyin: '', major: '', school: '',
    id_card: '', phone: '', email: '', province: '',
    gender: '', age: '', education: '', address: '', zip_code: '',
  })
  const [idCardKey, setIdCardKey] = useState('')
  const [portraitKey, setPortraitKey] = useState('')
  const [xuexinKey, setXuexinKey] = useState('')
  const [appFormKey, setAppFormKey] = useState('')

  useLoad((options) => {
    setBatchId(Number(options?.batch_id || 0))
    setLevel((options?.level as '1' | '2') || '1')
  })

  useEffect(() => {
    if (!batchId) return
    nispService.listBatches().then(batches => {
      const found = batches.find(b => b.id === batchId)
      if (found) setBatch(found)
    }).catch(() => {})
  }, [batchId])

  const setField = (key: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const uploadFile = async (
    setter: (key: string) => void,
    fileType: 'image' | 'pdf',
  ) => {
    try {
      let filePath = ''
      if (fileType === 'image') {
        const result = await Taro.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
        filePath = result.tempFilePaths[0]
      } else {
        const result = await Taro.chooseMessageFile({ count: 1, type: 'file' })
        filePath = result.tempFiles[0].path
      }
      if (!filePath) return

      Taro.showLoading({ title: '上传中', mask: true })
      // Upload to server which stores to OSS
      const baseUrl = (process.env.TARO_APP_API_BASE || '').replace(/\/+$/, '')
      const token = Taro.getStorageSync('access_token') || ''
      const uploadResult = await Taro.uploadFile({
        url: `${baseUrl}/api/nisp/materials/upload`,
        filePath,
        name: 'file',
        formData: { material_type: fileType === 'image' ? 'portrait_photo' : 'id_card_both_sides' },
        header: { Authorization: token ? `Bearer ${token}` : '' },
      })
      Taro.hideLoading()

      const payload = JSON.parse(uploadResult.data) as {
        code: number
        data?: { storage_key: string }
        message: string
      }
      if (payload.code !== 0 || !payload.data?.storage_key) {
        throw new Error(payload.message || '上传失败')
      }
      setter(payload.data.storage_key)
    } catch (error) {
      Taro.hideLoading()
      if ((error as { errMsg?: string })?.errMsg?.includes('cancel')) return
      Taro.showToast({
        title: error instanceof Error ? error.message : '上传失败',
        icon: 'none',
        duration: 3000,
      })
    }
  }

  const validate = (): boolean => {
    const required: (keyof FormState)[] = level === '1'
      ? ['name', 'pinyin', 'major', 'school', 'id_card', 'phone', 'email', 'province']
      : ['name', 'pinyin', 'major', 'school', 'id_card', 'phone', 'email', 'province',
         'gender', 'age', 'education', 'address', 'zip_code']

    for (const field of required) {
      if (!form[field]) {
        Taro.showToast({ title: `请填写${field}`, icon: 'none' })
        return false
      }
    }
    if (form.id_card.length !== 18) {
      Taro.showToast({ title: '身份证号必须为18位', icon: 'none' })
      return false
    }
    if (!/^1\d{10}$/.test(form.phone)) {
      Taro.showToast({ title: '手机号格式不正确', icon: 'none' })
      return false
    }
    if (!idCardKey || !portraitKey) {
      Taro.showToast({ title: '请上传身份证和寸照', icon: 'none' })
      return false
    }
    if (level === '2' && !xuexinKey) {
      Taro.showToast({ title: '请上传学籍报告', icon: 'none' })
      return false
    }
    if (level === '2' && !appFormKey) {
      Taro.showToast({ title: '请上传申请表', icon: 'none' })
      return false
    }
    return true
  }

  const submit = async () => {
    if (!batch || submitting || !validate()) return
    setSubmitting(true)
    try {
      const payload: NispOrderCreatePayload = {
        batch_id: batch.id,
        level,
        name: form.name.trim(),
        pinyin: form.pinyin.trim().toUpperCase(),
        major: form.major.trim(),
        school: form.school.trim(),
        id_card: form.id_card.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        province: form.province,
        id_card_both_sides_key: idCardKey,
        portrait_photo_key: portraitKey,
        ...(level === '2' ? {
          gender: form.gender,
          age: parseInt(form.age, 10),
          education: form.education,
          address: form.address.trim(),
          zip_code: form.zip_code.trim(),
          xuexin_report_key: xuexinKey,
          application_form_key: appFormKey,
        } : {}),
      }
      const registration = await nispService.createOrder(payload)
      Taro.showToast({ title: '报名成功', icon: 'success' })
      setTimeout(() => {
        Taro.navigateTo({
          url: `/${ROUTES.PAYMENT_RESULT}?order_id=${registration.id}&status=success&cert_name=NISP认证`
        })
      }, 1500)
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error ? error.message : '提交失败，请重试',
        icon: 'none', duration: 3000,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const price = batch
    ? (level === '1' ? batch.level1_price_cents : batch.level2_price_cents) / 100
    : 0

  const inputField = (key: keyof FormState, label: string, placeholder: string, required = false) => (
    <View className={styles.field} key={key}>
      <View className={styles.labelRow}>
        {required && <Text className={styles.required}>*</Text>}
        <Text className={styles.label}>{label}</Text>
      </View>
      <Input
        className={styles.input}
        value={form[key]}
        onInput={(e) => setField(key, e.detail.value)}
        placeholder={placeholder}
        placeholderClass={styles.remark}
      />
    </View>
  )

  const pickerField = (key: keyof FormState, label: string, options: string[]) => (
    <View className={styles.field} key={key}>
      <View className={styles.labelRow}>
        <Text className={styles.required}>*</Text>
        <Text className={styles.label}>{label}</Text>
      </View>
      <Picker
        mode='selector'
        range={options}
        onChange={(e) => setField(key, options[e.detail.value])}
      >
        <View className={styles.input} style={{ display: 'flex', alignItems: 'center' }}>
          <Text style={{ color: form[key] ? '#17233d' : '#98a2b3' }}>
            {form[key] || `请选择${label}`}
          </Text>
        </View>
      </Picker>
    </View>
  )

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={`NISP${level === '1' ? '一级' : '二级'}报名`} shouldShowBack />
        <ScrollView className={styles.body} scrollY>
          {/* 基本信息 */}
          {inputField('name', '姓名', '请输入真实姓名', true)}
          {inputField('pinyin', '拼音', '如：ZHANG SAN', true)}
          {inputField('major', '专业', '如：信息安全', true)}
          {inputField('school', '学校/单位名称', '如：成都工业职业技术学院', true)}
          {inputField('id_card', '身份证号', '18位身份证号', true)}
          {inputField('phone', '手机号码', '11位手机号', true)}
          {inputField('email', '邮箱', '用于接收考试通知', true)}
          {pickerField('province', '报考省份', PROVINCES)}

          {/* 二级额外字段 */}
          {level === '2' && (
            <>
              {pickerField('gender', '性别', GENDERS)}
              {inputField('age', '年龄', '如：22', true)}
              {pickerField('education', '最高学历', EDUCATIONS)}
              {inputField('address', '通信地址', '省市区街道', true)}
              {inputField('zip_code', '邮编', '6位邮政编码', true)}
            </>
          )}

          {/* 材料上传 */}
          <View className={styles.field}>
            <View className={styles.labelRow}>
              <Text className={styles.required}>*</Text>
              <Text className={styles.label}>身份证双面（PDF）</Text>
            </View>
            <View
              className={`${styles.uploadBox} ${idCardKey ? styles.uploaded : ''}`}
              onClick={() => uploadFile(setIdCardKey, 'pdf')}
            >
              <Text>{idCardKey ? '已上传' : '点击上传（以姓名命名，PDF格式）'}</Text>
            </View>
          </View>

          <View className={styles.field}>
            <View className={styles.labelRow}>
              <Text className={styles.required}>*</Text>
              <Text className={styles.label}>寸照（JPG）</Text>
            </View>
            <View
              className={`${styles.uploadBox} ${portraitKey ? styles.uploaded : ''}`}
              onClick={() => uploadFile(setPortraitKey, 'image')}
            >
              <Text>{portraitKey ? '已上传' : '点击上传（30KB-200KB，2寸蓝底证件照）'}</Text>
            </View>
          </View>

          {level === '2' && (
            <>
              <View className={styles.field}>
                <View className={styles.labelRow}>
                  <Text className={styles.required}>*</Text>
                  <Text className={styles.label}>学籍报告（PDF）</Text>
                </View>
                <View
                  className={`${styles.uploadBox} ${xuexinKey ? styles.uploaded : ''}`}
                  onClick={() => uploadFile(setXuexinKey, 'pdf')}
                >
                  <Text>{xuexinKey ? '已上传' : '点击上传（教育部学籍在线验证报告）'}</Text>
                </View>
              </View>

              <View className={styles.field}>
                <View className={styles.labelRow}>
                  <Text className={styles.required}>*</Text>
                  <Text className={styles.label}>NISP二级申请表</Text>
                </View>
                <View
                  className={`${styles.uploadBox} ${appFormKey ? styles.uploaded : ''}`}
                  onClick={() => uploadFile(setAppFormKey, 'pdf')}
                >
                  <Text>{appFormKey ? '已上传' : '点击上传（下载模板填写后上传）'}</Text>
                </View>
              </View>
            </>
          )}

          {/* 价格和提交 */}
          <View className={styles.row} style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #f2f4f7' }}>
            <Text className={styles.label}>报名费用</Text>
            <Text className={styles.price}>¥{price.toFixed(2)}</Text>
          </View>

          <View style={{ marginTop: 24, marginBottom: 40 }}>
            <Button variant='gradient' size='lg' onClick={submit}>
              {submitting ? '提交中...' : `提交并支付 ¥${price.toFixed(2)}`}
            </Button>
          </View>
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
