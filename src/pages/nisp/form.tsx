import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, Input, Picker } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { AgreementCheckbox } from '@/components/AgreementCheckbox'
import { nispService } from '@/services/nispService'
import type { NispBatch, NispMaterialType, NispOrderCreatePayload } from '@/services/nispService'
import {
  DEFAULT_NISP_APPLICATION_FORM_ENTRY_TEXT,
  DEFAULT_NISP_EDUCATION_REPORT_ENTRY_TEXT,
  NISP_EDUCATION_REPORT_GUIDE_SCENE,
  NISP_LEVEL2_APPLICATION_FORM_SCENE,
  getDocument,
  getDocumentScene,
} from '@/services/documentService'
import type { DocumentSceneSlot } from '@/services/documentService'
import { ROUTES } from '@/constants/routes'
import { STRINGS } from '@/constants/strings'
import { ensureAgreementSigned } from '@/utils/agreementGate'
import styles from './nisp.module.scss'

const PROVINCES = [
  '北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江',
  '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南',
  '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州',
  '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆',
]

const EDUCATIONS = ['高中', '中专', '大专', '本科', '硕士', '博士']
const GENDERS = ['男', '女']
const DEFAULT_MATERIAL_MAX_BYTES = 10 * 1024 * 1024

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
  const [agreed, setAgreed] = useState(false)
  const [form, setForm] = useState<FormState>({
    name: '', pinyin: '', major: '', school: '',
    id_card: '', phone: '', email: '', province: '',
    gender: '', age: '', education: '', address: '', zip_code: '',
  })
  const [idCardKey, setIdCardKey] = useState('')
  const [portraitKey, setPortraitKey] = useState('')
  const [xuexinKey, setXuexinKey] = useState('')
  const [appFormKey, setAppFormKey] = useState('')
  const [educationGuideSlot, setEducationGuideSlot] = useState<DocumentSceneSlot | null>(null)
  const [applicationFormSlot, setApplicationFormSlot] = useState<DocumentSceneSlot | null>(null)

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

  useEffect(() => {
    if (level !== '2') return
    getDocumentScene(NISP_EDUCATION_REPORT_GUIDE_SCENE)
      .then(setEducationGuideSlot)
      .catch(() => setEducationGuideSlot(null))
    getDocumentScene(NISP_LEVEL2_APPLICATION_FORM_SCENE)
      .then(setApplicationFormSlot)
      .catch(() => setApplicationFormSlot(null))
  }, [level])

  const setField = (key: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const openManagedDocument = useCallback(async (slot: DocumentSceneSlot | null) => {
    try {
      if (!slot?.document) {
        throw new Error('文档暂未配置，请联系管理员')
      }
      const document = await getDocument(slot.document.document_key)
      const downloaded = await Taro.downloadFile({ url: document.download_url })
      if (downloaded.statusCode !== 200 || !downloaded.tempFilePath) {
        throw new Error(downloaded.errMsg || '文档下载失败')
      }
      await Taro.openDocument({
        filePath: downloaded.tempFilePath,
        fileType: 'pdf',
        showMenu: true,
      })
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error && error.message
          ? error.message
          : '文档下载失败，请稍后重试',
        icon: 'none',
        duration: 3000,
      })
    }
  }, [])

  const uploadFile = async (
    setter: (key: string) => void,
    fileType: NispMaterialType,
  ) => {
    try {
      let filePath = ''
      let fileSize = 0
      let originalFilename = ''
      if (fileType === 'portrait_photo') {
        const result = await Taro.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
        filePath = result.tempFilePaths[0] || ''
        fileSize = result.tempFiles[0]?.size || 0
      } else {
        const result = await Taro.chooseMessageFile({
          count: 1,
          type: 'file',
          extension: ['pdf'],
        })
        const selected = result.tempFiles[0]
        filePath = selected?.path || ''
        fileSize = selected?.size || 0
        originalFilename = selected?.name || ''
      }
      if (!filePath) return

      const maxBytes = batch?.max_material_bytes || DEFAULT_MATERIAL_MAX_BYTES
      if (fileSize > maxBytes) {
        Taro.showToast({
          title: `文件不能超过${Math.floor(maxBytes / 1024 / 1024)}MB`,
          icon: 'none',
          duration: 3000,
        })
        return
      }

      Taro.showLoading({ title: '上传中', mask: true })
      const uploaded = await nispService.uploadMaterial(
        filePath,
        fileType,
        originalFilename,
      )
      Taro.hideLoading()
      setter(uploaded.storage_key)
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
      Taro.showToast({ title: '请上传学籍验证报告', icon: 'none' })
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
    if (!agreed) {
      Taro.showToast({
        title: '请先阅读并同意认证报名信息处理授权协议',
        icon: 'none',
        duration: 3000,
      })
      return
    }

    if (!(await ensureAgreementSigned(
      'cert_registration',
      STRINGS.AGREEMENT_TYPE_CERT_REGISTRATION,
      '提交认证报名前，请先阅读并同意认证报名信息处理授权协议',
    ))) return

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
      const certName = level === '1' ? 'NISP一级认证' : 'NISP二级认证'
      Taro.redirectTo({
        url: `/${ROUTES.REGISTRATION_CONFIRM}?order_id=${registration.order_id}&cert_name=${encodeURIComponent(certName)}&price=${price.toFixed(2)}`,
      })
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

  const inputField = (
    key: keyof FormState,
    label: string,
    placeholder: string,
    required = false,
    wide = false,
  ) => (
    <View className={`${styles.field} ${wide ? styles.fieldWide : ''}`} key={key}>
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

  const pickerField = (
    key: keyof FormState,
    label: string,
    options: string[],
    wide = false,
  ) => (
    <View className={`${styles.field} ${wide ? styles.fieldWide : ''}`} key={key}>
      <View className={styles.labelRow}>
        <Text className={styles.required}>*</Text>
        <Text className={styles.label}>{label}</Text>
      </View>
      <Picker
        mode='selector'
        range={options}
        onChange={(e) => {
          const index = Number(e.detail.value)
          if (Number.isInteger(index) && index >= 0 && index < options.length) {
            setField(key, options[index])
          }
        }}
      >
        <View className={`${styles.input} ${styles.pickerValue}`}>
          <Text className={styles.pickerText} style={{ color: form[key] ? '#17233d' : '#98a2b3' }}>
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
          <View className={styles.summaryCard}>
            <View className={styles.summaryHead}>
              <Text className={`${styles.levelBadge} ${level === '1' ? styles.level1 : styles.level2}`}>
                NISP{level === '1' ? '一级' : '二级'}
              </Text>
              <Text className={styles.price}>¥{price.toFixed(2)}</Text>
            </View>
            <Text className={styles.batchName}>{batch?.name || '加载考试批次中...'}</Text>
            <View className={styles.summaryGrid}>
              <View className={styles.summaryItem}>
                <Text className={styles.summaryLabel}>考试时间</Text>
                <Text className={styles.summaryValue}>
                  {batch?.exam_date ? batch.exam_date.slice(0, 10) : '以批次安排为准'}
                </Text>
              </View>
              <View className={styles.summaryItem}>
                <Text className={styles.summaryLabel}>考试地点</Text>
                <Text className={styles.summaryValue}>{batch?.exam_location || '以批次安排为准'}</Text>
              </View>
            </View>
          </View>

          <View className={styles.sectionCard}>
            <Text className={styles.sectionTitle}>基础信息</Text>
            <View className={styles.fieldGrid}>
              {inputField('name', '姓名', '真实姓名', true)}
              {inputField('pinyin', '拼音', 'ZHANG SAN', true)}
              {inputField('major', '专业', '信息安全', true)}
              {pickerField('province', '报考省份', PROVINCES)}
              {inputField('school', '学校/单位', '学校或单位全称', true, true)}
              {inputField('id_card', '身份证号', '18位身份证号', true, true)}
              {inputField('phone', '手机号码', '11位手机号', true)}
              {inputField('email', '邮箱', '用于考试通知', true)}
            </View>
          </View>

          {/* 二级额外字段 */}
          {level === '2' && (
            <View className={styles.sectionCard}>
              <Text className={styles.sectionTitle}>二级补充信息</Text>
              <View className={styles.fieldGrid}>
              {pickerField('gender', '性别', GENDERS)}
              {inputField('age', '年龄', '如：22', true)}
              {pickerField('education', '最高学历', EDUCATIONS)}
                {inputField('zip_code', '邮编', '6位', true)}
                {inputField('address', '通信地址', '省市区街道', true, true)}
              </View>
            </View>
          )}

          {/* 材料上传 */}
          <View className={styles.sectionCard}>
            <Text className={styles.sectionTitle}>报名材料</Text>
            <View className={styles.uploadGrid}>
              <View className={styles.field}>
                <View className={styles.labelRow}>
                  <Text className={styles.required}>*</Text>
                  <Text className={styles.label}>身份证双面</Text>
                </View>
                <View
                  className={`${styles.uploadBox} ${idCardKey ? styles.uploaded : ''}`}
                  onClick={() => uploadFile(setIdCardKey, 'id_card_both_sides')}
                >
                  <Text>{idCardKey ? '已上传' : 'PDF\n以姓名命名'}</Text>
                </View>
              </View>

              <View className={styles.field}>
                <View className={styles.labelRow}>
                  <Text className={styles.required}>*</Text>
                  <Text className={styles.label}>证件照</Text>
                </View>
                <View
                  className={`${styles.uploadBox} ${portraitKey ? styles.uploaded : ''}`}
                  onClick={() => uploadFile(setPortraitKey, 'portrait_photo')}
                >
                  <Text>{portraitKey ? '已上传' : 'JPG\n二寸蓝底'}</Text>
                </View>
              </View>

              {level === '2' && (
                <>
                  <View className={styles.field}>
                    <View className={styles.labelRow}>
                      <Text className={styles.required}>*</Text>
                      <Text className={styles.label}>学籍验证报告</Text>
                    </View>
                    <View
                      className={`${styles.uploadBox} ${xuexinKey ? styles.uploaded : ''}`}
                      onClick={() => uploadFile(setXuexinKey, 'xuexin_report')}
                    >
                      <Text>{xuexinKey ? '已上传' : 'PDF\n导出命名为姓名-学籍报告'}</Text>
                    </View>
                    <View
                      className={styles.guideLink}
                      onClick={() => void openManagedDocument(educationGuideSlot)}
                    >
                      <Text>
                        {educationGuideSlot?.entry_text || DEFAULT_NISP_EDUCATION_REPORT_ENTRY_TEXT}
                      </Text>
                    </View>
                  </View>

                  <View className={styles.field}>
                    <View className={styles.labelRow}>
                      <Text className={styles.required}>*</Text>
                      <Text className={styles.label}>二级申请表</Text>
                    </View>
                    <View
                      className={`${styles.uploadBox} ${appFormKey ? styles.uploaded : ''}`}
                      onClick={() => uploadFile(setAppFormKey, 'application_form')}
                    >
                      <Text>{appFormKey ? '已上传' : 'PDF\n导出时保留原文件名'}</Text>
                    </View>
                    <View
                      className={styles.guideLink}
                      onClick={() => void openManagedDocument(applicationFormSlot)}
                    >
                      <Text>
                        {applicationFormSlot?.entry_text || DEFAULT_NISP_APPLICATION_FORM_ENTRY_TEXT}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* 价格和提交 */}
          <View className={styles.footerCard}>
            <View className={styles.row}>
              <Text className={styles.label}>报名费用</Text>
              <Text className={styles.price}>¥{price.toFixed(2)}</Text>
            </View>

            <View className={styles.agreementBox}>
              <AgreementCheckbox agreed={agreed} onChange={setAgreed}>
                <Text>我已阅读并同意</Text>
                <Text
                  className={styles.agreementLink}
                  onClick={() => Taro.navigateTo({
                    url: `/${ROUTES.AGREEMENT_VIEW}?type=cert_registration&requireSign=1`,
                  })}
                >
                  《{STRINGS.AGREEMENT_TYPE_CERT_REGISTRATION}》
                </Text>
              </AgreementCheckbox>
            </View>

            <View className={styles.submitBox}>
              <Button variant='gradient' size='lg' onClick={submit}>
                {submitting ? '提交中...' : `提交并支付 ¥${price.toFixed(2)}`}
              </Button>
            </View>
          </View>
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
