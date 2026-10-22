import { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, Picker } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { FormInput } from '@/components/FormInput'
import { MaterialItem, RegistrationSummary, RegistrationSubmitBar } from '@/components/RegistrationParts'
import { DocumentActions } from '@/components/DocumentActions'
import { useDocumentActions } from '@/hooks/useDocumentActions'
import { AgreementCheckbox } from '@/components/AgreementCheckbox'
import { nispService } from '@/services/nispService'
import { getUserProfile } from '@/services/userService'
import type { NispBatch, NispMaterialType, NispOrderCreatePayload } from '@/services/nispService'
import {
  DEFAULT_NISP_APPLICATION_FORM_ENTRY_TEXT,
  DEFAULT_NISP_EDUCATION_REPORT_ENTRY_TEXT,
  NISP_EDUCATION_REPORT_GUIDE_SCENE,
  NISP_LEVEL2_APPLICATION_FORM_SCENE,
  getDocumentScene,
} from '@/services/documentService'
import type { DocumentSceneSlot } from '@/services/documentService'
import { ROUTES } from '@/constants/routes'
import { STRINGS } from '@/constants/strings'
import { ensureAgreementSigned } from '@/utils/agreementGate'
import { formatDate } from '@/utils/format'
import { formatNispApplyRange } from '@/utils/nisp'
import { findNispBatch, validateNispForm, nispErrorMessage, NISP_MATERIAL_LABELS, type NispFormValues, type NispFormErrors, type NispErrorKey } from '@/utils/nispForm'
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

type FormState = NispFormValues

export default function NispFormPage() {
  const [batchId, setBatchId] = useState(0)
  const [level, setLevel] = useState<'1' | '2'>('1')
  const [batch, setBatch] = useState<NispBatch | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const operationLock = useRef(false)
  const documentActions = useDocumentActions(() => operationLock.current)
  const [batchState, setBatchState] = useState<'loading' | 'ready' | 'error' | 'missing'>('loading')
  const [batchError, setBatchError] = useState('')
  const [batchRetry, setBatchRetry] = useState(0)
  const [routeReady, setRouteReady] = useState(false)
  const [uploading, setUploading] = useState<NispMaterialType | null>(null)
  const [fileInfo, setFileInfo] = useState<Partial<Record<NispMaterialType, { filename: string; size: number }>>>({})
  const [errors, setErrors] = useState<NispFormErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [scrollTarget, setScrollTarget] = useState('')
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
  const [identityVerified, setIdentityVerified] = useState(false)

  useLoad((options) => {
    setBatchId(Number(options?.batch_id || 0))
    setLevel(options?.level === '2' ? '2' : '1')
    setRouteReady(true)
  })

  useEffect(() => {
    getUserProfile().then(profile => {
      const realname = profile.realname
      const verified =
        realname?.identity_status === 'verified' &&
        Boolean(realname.real_name && realname.id_card_raw)
      setIdentityVerified(verified)
      if (!verified || !realname) {
        Taro.showToast({ title: '请先完成实名认证', icon: 'none', duration: 2500 })
        return
      }
      setForm(old => ({
        ...old,
        name: realname.real_name || '',
        id_card: realname.id_card_raw || '',
        gender: realname.gender || '',
        age: realname.age === null || realname.age === undefined ? '' : String(realname.age),
        zip_code: realname.zip_code || '',
        major: profile.student?.major || old.major,
        school: profile.student?.school || old.school,
        education: profile.student?.education || old.education,
      }))
    }).catch(() => {
      setIdentityVerified(false)
      Taro.showToast({ title: '加载实名信息失败，请先完成实名认证', icon: 'none' })
    })
  }, [])

  useEffect(() => {
    if (!routeReady) return
    let active = true
    setBatch(null); setBatchError(''); setBatchState('loading')
    if (!Number.isSafeInteger(batchId) || batchId <= 0) { setBatchState('missing'); return }
    findNispBatch(batchId, () => nispService.listBatches()).then(found => {
      if (!active) return
      if (!found) { setBatchState('missing'); return }
      setBatch(found); setLevel(found.level); setBatchState('ready')
    }).catch(error => {
      if (!active) return
      setBatchState('error'); setBatchError(nispErrorMessage(error, '批次加载失败，请重试'))
    })
    return () => { active = false }
  }, [batchId, batchRetry, routeReady])

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
    setErrors(previous => ({ ...previous, [key]: undefined }))
  }

  const locateError = (key: NispErrorKey) => {
    setScrollTarget('')
    Taro.nextTick(() => setScrollTarget(`nisp-${key}`))
  }

  const uploadFile = async (setter: (key: string) => void, fileType: NispMaterialType) => {
    if (operationLock.current || documentActions.isBusy() || batchState !== 'ready') return
    operationLock.current = true
    setUploading(fileType)
    setErrors(previous => ({ ...previous, [fileType]: undefined }))
    try {
      let filePath = ''
      let fileSize = 0
      let originalFilename = ''
      if (fileType === 'portrait_photo') {
        const result = await Taro.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
        filePath = result.tempFilePaths[0] || ''
        fileSize = result.tempFiles[0]?.size || 0
        originalFilename = filePath.split('/').pop() || '证件照.jpg'
        if (filePath && !/\.jpe?g$/i.test(originalFilename)) throw new Error('证件照须为JPG格式，请选择JPG照片')
      } else {
        const result = await Taro.chooseMessageFile({ count: 1, type: 'file', extension: ['pdf'] })
        const selected = result.tempFiles[0]
        filePath = selected?.path || ''
        fileSize = selected?.size || 0
        originalFilename = selected?.name || ''
        if (filePath && !/\.pdf$/i.test(originalFilename)) throw new Error('请使用PDF格式材料')
      }
      if (!filePath) return
      const maxBytes = batch?.max_material_bytes || DEFAULT_MATERIAL_MAX_BYTES
      if (fileSize > maxBytes) throw new Error(`文件不能超过${Number((maxBytes / 1024 / 1024).toFixed(2))}MB`)
      const uploaded = await nispService.uploadMaterial(filePath, fileType, originalFilename)
      setter(uploaded.storage_key)
      setFileInfo(previous => ({ ...previous, [fileType]: { filename: uploaded.original_filename || originalFilename, size: uploaded.size_bytes || fileSize } }))
      setErrors(previous => ({ ...previous, [fileType]: undefined }))
    } catch (error) {
      if (!/cancel/i.test(String((error as { errMsg?: string })?.errMsg || (error as Error)?.message || ''))) {
        setErrors(previous => ({ ...previous, [fileType]: nispErrorMessage(error, `${NISP_MATERIAL_LABELS[fileType]}上传失败，请重试`) }))
      }
    } finally { operationLock.current = false; setUploading(null) }
  }

  const validate = (): boolean => {
    const next = validateNispForm(form, level, { id_card_both_sides: idCardKey, portrait_photo: portraitKey, xuexin_report: xuexinKey, application_form: appFormKey })
    if (!agreed) next.agreement = '请先阅读并同意认证报名信息处理授权协议'
    setErrors(next)
    const first = Object.keys(next)[0] as NispErrorKey | undefined
    if (first) locateError(first)
    return !first
  }

  const submit = async () => {
    if (operationLock.current || documentActions.isBusy() || batchState !== 'ready') return
    setSubmitError('')
    if (!identityVerified) {
      Taro.showToast({ title: '请先完成实名认证', icon: 'none', duration: 2000 })
      setTimeout(() => Taro.navigateTo({ url: `/${ROUTES.MINE_EDIT_PROFILE}` }), 500)
      return
    }
    if (!batch || submitting || !validate()) return
    operationLock.current = true
    setSubmitting(true)
    try {
      if (!(await ensureAgreementSigned(
        'cert_registration',
        STRINGS.AGREEMENT_TYPE_CERT_REGISTRATION,
        '提交认证报名前，请先阅读并同意认证报名信息处理授权协议',
      ))) return
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
      if (registration.price_cents === 0 && registration.status === 'pending_review') {
        await Taro.redirectTo({
          url: `/${ROUTES.PAYMENT_RESULT}?order_id=${registration.order_id}&status=success&cert_name=${encodeURIComponent(certName)}&price=0`,
        })
        return
      }
      await Taro.redirectTo({
        url: `/${ROUTES.REGISTRATION_CONFIRM}?order_id=${registration.order_id}&cert_name=${encodeURIComponent(certName)}&price=${price.toFixed(2)}`,
      })
    } catch (error) {
      setSubmitError(nispErrorMessage(error, '提交失败，请重试'))
    } finally {
      operationLock.current = false
      setSubmitting(false)
    }
  }

  const price = batch
    ? (level === '1' ? batch.level1_price_cents : batch.level2_price_cents) / 100
    : 0

  const materialKinds: NispMaterialType[] = ['id_card_both_sides', 'portrait_photo', ...(level === '2' ? ['xuexin_report', 'application_form'] as NispMaterialType[] : [])]

  const inputField = (
    key: keyof FormState,
    label: string,
    placeholder: string,
    required = false,
    wide = false,
    readonly = false,
  ) => (
    <View id={`nisp-${key}`} className={`${styles.field} ${wide ? styles.fieldWide : ''}`} key={key}>
      <FormInput compact label={label} required={required} placeholder={placeholder} value={form[key]} disabled={readonly || submitting}
        onChange={value => setField(key, value)} error={errors[key] ? { valid: false, message: errors[key]! } : undefined} />
    </View>
  )

  const pickerField = (
    key: keyof FormState,
    label: string,
    options: string[],
    wide = false,
  ) => (
    <View id={`nisp-${key}`} className={`${styles.field} ${wide ? styles.fieldWide : ''}`} key={key}>
      <View className={styles.labelRow}>
        <Text className={styles.required}>*</Text>
        <Text className={styles.label}>{label}</Text>
      </View>
      <Picker
        mode='selector'
        disabled={submitting}
        range={options}
        onChange={(e) => {
          const index = Number(e.detail.value)
          if (Number.isInteger(index) && index >= 0 && index < options.length) {
            setField(key, options[index])
          }
        }}
      >
        <View className={`${styles.input} ${styles.pickerValue} ${errors[key] ? styles.inputError : ''}`}>
          <Text className={styles.pickerText} style={{ color: form[key] ? '#17233d' : '#98a2b3' }}>
            {form[key] || `请选择${label}`}
          </Text>
        </View>
      </Picker>
      {errors[key] && <Text className={styles.fieldError}>{errors[key]}</Text>}
    </View>
  )

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={`NISP${level === '1' ? '一级' : '二级'}报名`} shouldShowBack />
        <ScrollView className={`${styles.body} ${styles.bodyWithFooter}`} scrollY scrollIntoView={scrollTarget} scrollWithAnimation>
          <RegistrationSummary badge={`NISP${level === '1' ? '一级' : '二级'}`} title={batch?.name || (batchState === 'loading' ? '加载考试批次中…' : batchState === 'missing' ? '批次不存在或已下架' : '批次加载失败')}
            priceCents={batch ? Math.round(price * 100) : null}
            items={[{ label: '报名时间', value: batch ? formatNispApplyRange(batch) : '以批次安排为准', wide: true }, { label: '考试时间', value: batch?.exam_date ? formatDate(batch.exam_date) : '以批次安排为准' }, { label: '考试地点', value: batch?.exam_location || '以批次安排为准' }]}>
            {batchState === 'error' && <View><Text className={styles.fieldError}>{batchError}</Text><Button variant='secondary' onClick={() => setBatchRetry(value => value + 1)}>重新加载批次</Button></View>}
            {batchState === 'missing' && <Text className={styles.fieldError}>该批次不可用，请返回重新选择批次。</Text>}
          </RegistrationSummary>

          <View className={styles.sectionCard}>
            <Text className={styles.sectionTitle}>基础信息</Text>
            <View className={styles.fieldGrid}>
              {inputField('name', '姓名', '实名认证姓名', true, false, true)}
              {inputField('pinyin', '姓名拼音', 'ZHANG SAN', true)}
              {inputField('major', '专业', '信息安全', true)}
              {pickerField('province', '报考省份', PROVINCES)}
              {inputField('school', '学校/单位', '学校或单位全称', true, true)}
              {inputField('id_card', '身份证号', '实名认证身份证号', true, true, true)}
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

          <View className={styles.sectionCard}>
            <Text className={styles.sectionTitle}>联系信息</Text>
            <View className={styles.fieldGrid}>
              {inputField('phone', '手机号码', '11位手机号', true)}
              {inputField('email', '邮箱', '用于考试通知', true)}
            </View>
          </View>

          {/* 材料上传 */}
          <View className={styles.sectionCard}>
            <Text className={styles.sectionTitle}>报名材料</Text>
            <Text className={styles.materialCount}>已上传 {materialKinds.filter(kind => fileInfo[kind]).length}/{materialKinds.length} 项，请按要求上传本人材料。</Text>
            <View className={styles.materialList}>
              {materialKinds.map(kind => {
                const setters = { id_card_both_sides: setIdCardKey, portrait_photo: setPortraitKey, xuexin_report: setXuexinKey, application_form: setAppFormKey }
                const info = fileInfo[kind]
                return <MaterialItem key={kind} id={`nisp-${kind}`} title={NISP_MATERIAL_LABELS[kind]} required
                  requirement={`${kind === 'portrait_photo' ? 'JPG，二寸蓝底照片' : 'PDF，请从微信聊天文件选择'}，最大${Number(((batch?.max_material_bytes || DEFAULT_MATERIAL_MAX_BYTES) / 1024 / 1024).toFixed(2))}MB`}
                  file={info ? { name: info.filename, size: info.size } : undefined} uploading={uploading === kind}
                  disabled={submitting || Boolean(uploading) || Boolean(documentActions.busy) || batchState !== 'ready'} error={errors[kind]} onUpload={() => void uploadFile(setters[kind], kind)}>
                  {kind === 'xuexin_report' && <DocumentActions scene={NISP_EDUCATION_REPORT_GUIDE_SCENE} title={educationGuideSlot?.entry_text || DEFAULT_NISP_EDUCATION_REPORT_ENTRY_TEXT} previewLabel='预览教程' controller={documentActions} disabled={submitting || Boolean(uploading) || batchState !== 'ready'} />}
                  {kind === 'application_form' && <DocumentActions scene={NISP_LEVEL2_APPLICATION_FORM_SCENE} title={applicationFormSlot?.entry_text || DEFAULT_NISP_APPLICATION_FORM_ENTRY_TEXT} previewLabel='预览模板' controller={documentActions} disabled={submitting || Boolean(uploading) || batchState !== 'ready'} />}
                </MaterialItem>
              })}
            </View>
          </View>

          {/* 价格和提交 */}
          <View className={styles.footerCard}>
            <Text className={styles.sectionTitle}>协议与提交</Text>
            <View id='nisp-agreement' className={styles.agreementBox}>
              <AgreementCheckbox agreed={agreed} onChange={value => { if (operationLock.current) return; setAgreed(value); setErrors(previous => ({ ...previous, agreement: undefined })) }}>
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
              {errors.agreement && <Text className={styles.fieldError}>{errors.agreement}</Text>}
            </View>

            {submitError && <Text className={styles.fieldError}>{submitError}</Text>}

          </View>
        </ScrollView>
        <RegistrationSubmitBar priceCents={batch ? Math.round(price * 100) : null}
          disabled={!identityVerified || batchState !== 'ready' || Boolean(uploading) || Boolean(documentActions.busy) || submitting} loading={submitting} onSubmit={() => void submit()}
          label={!identityVerified ? '请先完成实名认证' : batchState !== 'ready' ? '请先加载有效批次' : uploading ? '材料上传中…' : documentActions.busy ? '文件操作中…' : price === 0 ? '提交报名' : '提交报名，前往付款'} />
      </View>
    </AuthGuard>
  )
}
