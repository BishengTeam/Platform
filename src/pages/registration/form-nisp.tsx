import { useState, useMemo, useCallback, useEffect } from 'react'
import { View, Text, ScrollView, Button as TaroButton } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { useIdentityCheck } from '@/hooks/useIdentityCheck'
import { usePhoneDecrypt } from '@/hooks/usePhoneDecrypt'
import { Button } from '@/components/Button'
import { FormInput } from '@/components/FormInput'
import { FormPicker } from '@/components/FormPicker'
import { PriceRow } from '@/components/PriceRow'
import { STRINGS } from '@/constants/strings'
import { getCertDetail, uploadFile, createOrder, getUserProfile } from '@/services/dataService'
import type { CertificationDetail } from '@/types'
import { validateName, validatePhone, validateIdCard, validateEmail, validateRequired } from '@/utils/validator'
import { autoPinyin } from '@/utils/pinyin'
import type { ValidationResult } from '@/utils/validator'
import styles from './form.module.scss'

const STORAGE_KEY = 'registration_nisp_form'

export default function NispFormPage() {
  const [certId, setCertId] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [idCard, setIdCard] = useState('')
  const [email, setEmail] = useState('')
  const [school, setSchool] = useState('')
  const [major, setMajor] = useState('')
  const [province, setProvince] = useState('')
  const [level, setLevel] = useState<'1' | '2'>('1')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [age, setAge] = useState('')
  const [education, setEducation] = useState('')
  const [address, setAddress] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [portraitPhotoPath, setPortraitPhotoPath] = useState('')
  const [idPhotoPath, setIdPhotoPath] = useState('')
  const [xuexinReportPath, setXuexinReportPath] = useState('')
  const [templatePath, setTemplatePath] = useState('')
  const [errors, setErrors] = useState<Record<string, ValidationResult>>({})

  const identity = useIdentityCheck()
  const [identityName, setIdentityName] = useState('')
  const [identityIdCard, setIdentityIdCard] = useState('')
  const { decrypting, handleGetPhoneNumber } = usePhoneDecrypt()

  useLoad((options) => {
    setCertId(options?.cert_id || '')
  })

  const [cert, setCert] = useState<CertificationDetail | null>(null)

  useEffect(() => {
    const id = Number(certId)
    if (!id) return
    getCertDetail(id).then(setCert).catch(() => {})
  }, [certId])

  useEffect(() => {
    getUserProfile().then(profile => {
      if (profile.profile.phone && !phone) setPhone(profile.profile.phone)
      if (profile.realname?.real_name && !name) setName(profile.realname.real_name)
      if (profile.realname?.id_card_raw && !idCard) setIdCard(profile.realname.id_card_raw)
      if (profile.profile.email && !email) setEmail(profile.profile.email)
      if (profile.student?.school && !school) setSchool(profile.student.school)
      if (profile.student?.major && !major) setMajor(profile.student.major)
      if (profile.realname?.gender) {
        const g = profile.realname.gender
        if (g === 'male' || g === 'female') setGender(g)
      }
    }).catch(() => {})
  }, [])

  const trainingType = cert ? (cert as any).categoryName : ''
  const pinyin = name ? autoPinyin(name) : ''

  const handleValidate = useCallback(() => {
    const next: Record<string, ValidationResult> = {
      name: validateName(name),
      phone: validatePhone(phone),
      idCard: validateIdCard(idCard),
      email: validateEmail(email),
      school: validateRequired(school, STRINGS.FORM_SCHOOL),
      major: validateRequired(major, STRINGS.FORM_MAJOR),
      province: validateRequired(province, STRINGS.FORM_PROVINCE),
    }
    if (level === '2') {
      if (address && !address.trim()) next.address = { valid: false, message: STRINGS.VALIDATOR_ADDRESS_REQUIRED }
    }
    setErrors(next)
    return Object.values(next).every(v => v.valid)
  }, [name, phone, idCard, email, school, major, province, level, address])

  const handleUpload = (setter: (path: string) => void) => {
    Taro.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
      .then(res => {
        const filePath = res.tempFilePaths[0]
        uploadFile(filePath).then(({ url }) => setter(url))
          .catch(() => Taro.showToast({ title: '上传失败', icon: 'none' }))
      })
  }

  const handleSubmit = async () => {
    if (!cert || !handleValidate()) return
    await createOrder({
      cert_type: 'nisp',
      candidate_name: name.trim(),
      candidate_phone: phone.trim(),
      candidate_idcard: idCard.trim(),
      extra_data: {
        pinyin, email: email.trim(), school: school.trim(),
        major: major.trim(), province, training_type: trainingType, level,
        gender: level === '2' ? gender : undefined,
        age: level === '2' && age ? parseInt(age, 10) : undefined,
        education: level === '2' ? education : undefined,
        address: level === '2' ? address.trim() : undefined,
        zip_code: level === '2' ? zipCode.trim() : undefined,
        institution: level === '2' ? STRINGS.NISP_INSTITUTION_DEFAULT : undefined,
      },
      attachments: [portraitPhotoPath, idPhotoPath, xuexinReportPath, templatePath].filter(Boolean),
    })
    Taro.showToast({ title: STRINGS.NISP_PAY_SUCCESS_TOAST, icon: 'success' })
    setTimeout(() => Taro.navigateBack(), 1500)
  }

  // 实名认证检查：查询中
  if (identity.phase === 'checking') {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.IDENTITY_CHECK_TITLE} shouldShowBack />
          <View className={styles.body}>
            <View className={styles.loadingWrap}>
              <Text className={styles.loadingText}>加载中...</Text>
            </View>
          </View>
        </View>
      </AuthGuard>
    )
  }

  // 实名认证检查：未认证，展示认证表单
  if (identity.phase === 'unverified' || identity.phase === 'submitting') {
    const handleIdentitySubmit = async () => {
      if (!identityName.trim() || !identityIdCard.trim()) {
        Taro.showToast({ title: '请填写完整信息', icon: 'none' })
        return
      }
      const ok = await identity.submit(identityName.trim(), identityIdCard.trim())
      if (!ok) {
        Taro.showToast({ title: STRINGS.IDENTITY_CHECK_FAILED, icon: 'none' })
      }
    }

    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.IDENTITY_CHECK_TITLE} shouldShowBack />
          <View className={styles.body}>
            <View className={styles.section}>
              <Text className={styles.sectionTitle}>{STRINGS.IDENTITY_CHECK_DESC}</Text>
            </View>
            <View className={styles.section}>
              <FormInput
                label={STRINGS.FORM_REAL_NAME}
                required
                placeholder={STRINGS.FORM_REAL_NAME_PLACEHOLDER}
                value={identityName}
                onChange={setIdentityName}
              />
              <FormInput
                label={STRINGS.FORM_ID_CARD}
                required
                placeholder={STRINGS.FORM_ID_CARD_PLACEHOLDER}
                value={identityIdCard}
                type='idcard'
                maxlength={18}
                onChange={setIdentityIdCard}
              />
            </View>
            <View className={styles.btnWrap}>
              <Button
                variant='gradient'
                size='lg'
                onClick={handleIdentitySubmit}
              >
                {identity.phase === 'submitting' ? STRINGS.IDENTITY_CHECK_SUBMITTING : STRINGS.IDENTITY_CHECK_SUBMIT}
              </Button>
            </View>
          </View>
        </View>
      </AuthGuard>
    )
  }

  if (!cert) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.NISP_FORM_TITLE} shouldShowBack />
          <View className={styles.empty}><Text>{STRINGS.FORM_ERROR_CERT_NOT_FOUND}</Text></View>
        </View>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.NISP_FORM_TITLE} shouldShowBack />
        <ScrollView className={styles.body} scrollY>
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>{STRINGS.FORM_CERT_SUMMARY}</Text>
            <View className={styles.summaryCard}>
              <Text className={styles.certName}>{cert.name}</Text>
              <View className={styles.certMeta}>
                <Text className={styles.metaItem}>{STRINGS.FORM_TRAINING_TYPE}: {trainingType}</Text>
                <Text className={styles.metaItem}>{cert.examCode}</Text>
              </View>
            </View>
          </View>

          <View className={styles.section}>
            <Text className={styles.sectionTitle}>{STRINGS.FORM_NISP_LEVEL}</Text>
            <View className={styles.identityToggle}>
              <View className={`${styles.identityOption} ${level === '1' ? styles.identityActive : ''}`} onClick={() => setLevel('1')}>
                <Text>{STRINGS.NISP_LEVEL_1}</Text>
              </View>
              <View className={`${styles.identityOption} ${level === '2' ? styles.identityActive : ''}`} onClick={() => setLevel('2')}>
                <Text>{STRINGS.NISP_LEVEL_2}</Text>
              </View>
            </View>
          </View>

          <View className={styles.section}>
            <Text className={styles.sectionTitle}>{STRINGS.FORM_PERSONAL_INFO}</Text>
            <FormInput label={STRINGS.FORM_REAL_NAME} required placeholder={STRINGS.FORM_REAL_NAME_PLACEHOLDER} value={name} error={errors.name} onChange={setName} />
            <FormInput label={STRINGS.FORM_PINYIN} placeholder={pinyin} value={pinyin} onChange={() => {}} />
            <FormInput label={STRINGS.FORM_PHONE} required placeholder={STRINGS.FORM_PHONE_PLACEHOLDER} value={phone} type='number' maxlength={11} error={errors.phone} onChange={setPhone} />
            <View className={styles.phoneAuthRow}>
              <TaroButton
                className={styles.phoneAuthBtn}
                openType='getPhoneNumber'
                disabled={decrypting}
                onGetPhoneNumber={async (e) => {
                  const phoneStr = await handleGetPhoneNumber(e)
                  if (phoneStr) setPhone(phoneStr)
                }}
              >
                {decrypting ? STRINGS.FORM_PHONE_WECHAT_AUTHING : STRINGS.FORM_PHONE_WECHAT_AUTH}
              </TaroButton>
            </View>
            <FormInput label={STRINGS.FORM_ID_CARD} required placeholder={STRINGS.FORM_ID_CARD_PLACEHOLDER} value={idCard} type='idcard' maxlength={18} error={errors.idCard} onChange={setIdCard} />
            <FormInput label={STRINGS.FORM_EMAIL} required placeholder={STRINGS.FORM_EMAIL_PLACEHOLDER} value={email} error={errors.email} onChange={setEmail} />
            <FormInput label={STRINGS.FORM_SCHOOL} required placeholder={STRINGS.FORM_SCHOOL_PLACEHOLDER} value={school} error={errors.school} onChange={setSchool} />
            <FormInput label={STRINGS.FORM_MAJOR} required placeholder={STRINGS.FORM_MAJOR_PLACEHOLDER} value={major} error={errors.major} onChange={setMajor} />
            <FormInput label={STRINGS.FORM_PROVINCE} required placeholder={STRINGS.FORM_PROVINCE_PLACEHOLDER} value={province} error={errors.province} onChange={setProvince} />

            {level === '2' && (
              <>
                <View className={styles.identityRow}>
                  <Text className={styles.identityLabel}>{STRINGS.FORM_GENDER}</Text>
                  <View className={styles.identityToggle}>
                    <View className={`${styles.identityOption} ${gender === 'male' ? styles.identityActive : ''}`} onClick={() => setGender('male')}>
                      <Text>{STRINGS.FORM_GENDER_MALE}</Text>
                    </View>
                    <View className={`${styles.identityOption} ${gender === 'female' ? styles.identityActive : ''}`} onClick={() => setGender('female')}>
                      <Text>{STRINGS.FORM_GENDER_FEMALE}</Text>
                    </View>
                  </View>
                </View>
                <FormInput label={STRINGS.FORM_AGE} placeholder={STRINGS.FORM_AGE_PLACEHOLDER} value={age} type='number' maxlength={2} onChange={setAge} />
                <FormPicker
                  label={STRINGS.FORM_EDUCATION}
                  placeholder={STRINGS.FORM_EDUCATION_PLACEHOLDER}
                  value={education}
                  options={STRINGS.EDUCATION_OPTIONS}
                  onChange={setEducation}
                />
                <FormInput label={STRINGS.FORM_ADDRESS} placeholder={STRINGS.FORM_ADDRESS_PLACEHOLDER} value={address} onChange={setAddress} />
                <FormInput label={STRINGS.FORM_ZIP_CODE} placeholder={STRINGS.FORM_ZIP_CODE_PLACEHOLDER} value={zipCode} type='number' maxlength={6} onChange={setZipCode} />
                <FormInput label={STRINGS.FORM_INSTITUTION} placeholder='' value={STRINGS.NISP_INSTITUTION_DEFAULT} onChange={() => {}} />
              </>
            )}
          </View>

          <View className={styles.section}>
            <Text className={styles.sectionTitle}>{STRINGS.FORM_UPLOAD_MATERIALS}</Text>
            <View className={styles.summaryCard}>
              <Text className={styles.metaItem}>{level === '1' ? STRINGS.FORM_PORTRAIT_PHOTO_TIP_NISP1 : STRINGS.FORM_PORTRAIT_PHOTO_TIP_NISP2}</Text>
              <View className={styles.btnWrap}><Button variant='secondary' size='md' onClick={() => handleUpload(setPortraitPhotoPath)}>{STRINGS.FORM_UPLOAD_PORTRAIT_PHOTO}</Button></View>
              <Text className={styles.metaItem}>{STRINGS.FORM_ID_PHOTO_TIP_NISP}</Text>
              <View className={styles.btnWrap}><Button variant='secondary' size='md' onClick={() => handleUpload(setIdPhotoPath)}>{STRINGS.FORM_UPLOAD_ID_PHOTO}</Button></View>
              <Text className={styles.metaItem}>{STRINGS.FORM_XUEXIN_REPORT_TIP}</Text>
              <View className={styles.btnWrap}><Button variant='secondary' size='md' onClick={() => handleUpload(setXuexinReportPath)}>{STRINGS.FORM_UPLOAD_XUEXIN_REPORT}</Button></View>
              {level === '2' && (
                <>
                  <View className={styles.btnWrap}><Button variant='secondary' size='md' onClick={() => {
                    Taro.downloadFile({ url: '/api/nisp/template/download' })
                      .then(() => Taro.showToast({ title: '模板下载成功', icon: 'success' }))
                      .catch(() => Taro.showToast({ title: '下载失败，请稍后重试', icon: 'none' }))
                  }}>{STRINGS.FORM_TEMPLATE_DOWNLOAD}</Button></View>
                  <View className={styles.btnWrap}><Button variant='secondary' size='md' onClick={() => handleUpload(setTemplatePath)}>{STRINGS.FORM_TEMPLATE_UPLOAD}</Button></View>
                </>
              )}
            </View>
          </View>

          <View className={styles.section}>
            <Text className={styles.sectionTitle}>{STRINGS.FORM_PRICE_DETAIL}</Text>
            <View className={styles.priceCard}>
              <PriceRow label={STRINGS.FORM_PRICE_EXAM_FEE} value={cert.price} />
              <View className={styles.divider} />
              <PriceRow label={STRINGS.FORM_PRICE_TOTAL} value={cert.price} isTotal />
            </View>
          </View>

          <View className={styles.btnWrap}>
            <Button variant='gradient' size='lg' onClick={handleSubmit}>{STRINGS.FORM_SUBMIT}</Button>
          </View>
        </ScrollView>
      </View>
    </AuthGuard>
  )
}