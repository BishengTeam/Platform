import { useState, useCallback, useEffect } from 'react'
import { View, Text, ScrollView, Button as TaroButton } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { useIdentityCheck } from '@/hooks/useIdentityCheck'
import { usePhoneDecrypt } from '@/hooks/usePhoneDecrypt'
import { Button } from '@/components/Button'
import { FormInput } from '@/components/FormInput'
import { PriceRow } from '@/components/PriceRow'
import { STRINGS } from '@/constants/strings'
import { getCertDetail, uploadFile, createOrder, getUserProfile } from '@/services/dataService'
import type { CertificationDetail } from '@/types'
import { validateName, validatePhone, validateIdCard, validateEmail } from '@/utils/validator'
import type { ValidationResult } from '@/utils/validator'
import styles from './form.module.scss'

const STORAGE_KEY = 'registration_form_data'

export default function RegistrationFormPage() {
  const [certId, setCertId] = useState('')
  const [realName, setRealName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [idCard, setIdCard] = useState('')
  const [idPhotoPath, setIdPhotoPath] = useState('')
  const [education, setEducation] = useState('')
  const [organization, setOrganization] = useState('')
  const [examDate, setExamDate] = useState('')
  const [gender, setGender] = useState('')
  const [country, setCountry] = useState('')
  const [language, setLanguage] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [identityType, setIdentityType] = useState<'personal' | 'enterprise'>('personal')
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
      if (profile.phone && !phone) setPhone(profile.phone)
      if (profile.real_name && !realName) setRealName(profile.real_name)
      if (profile.email && !email) setEmail(profile.email)
    }).catch(() => {})
  }, [])

  const handleValidate = useCallback(() => {
    const next: Record<string, ValidationResult> = {
      realName: validateName(realName),
      phone: validatePhone(phone),
      idCard: validateIdCard(idCard),
    }
    if (email.trim()) next.email = validateEmail(email)
    setErrors(next)
    return Object.values(next).every(v => v.valid)
  }, [realName, phone, idCard, email])

  const handleSubmit = async () => {
    if (!cert || !handleValidate()) return

    const order = await createOrder({
      cert_type: cert.code,
      candidate_name: realName.trim(),
      candidate_phone: phone.trim(),
      candidate_idcard: idCard.trim(),
      extra_data: {
        email: email.trim(),
        education: education.trim(),
        organization: organization.trim(),
        exam_date: examDate,
        gender: gender || undefined,
        country: country || undefined,
        language: language || undefined,
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        identity_type: identityType,
      },
      attachments: [idPhotoPath].filter(Boolean),
    })

    Taro.navigateTo({ url: `/pages/registration/confirm?order_id=${order.id}` })
  }

  const handleChooseIdPhoto = () => {
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
    }).then(res => {
      const filePath = res.tempFilePaths[0]
      uploadFile(filePath).then(({ url }) => {
        setIdPhotoPath(url)
      }).catch(() => {
        Taro.showToast({ title: '上传失败', icon: 'none' })
      })
    }).catch(() => {})
  }

  const handlePickExamDate = () => {
    Taro.showToast({ title: STRINGS.FORM_PICK_EXAM_DATE, icon: 'none' })
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
          <PageHeader title={STRINGS.FORM_TITLE} shouldShowBack />
          <View className={styles.empty}><Text>{STRINGS.FORM_ERROR_CERT_NOT_FOUND}</Text></View>
        </View>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.FORM_TITLE} shouldShowBack />
        <ScrollView className={styles.body} scrollY>

          <View className={styles.section}>
            <Text className={styles.sectionTitle}>{STRINGS.FORM_CERT_SUMMARY}</Text>
            <View className={styles.summaryCard}>
              <Text className={styles.certName}>{cert.name}</Text>
              <View className={styles.certMeta}>
                <Text className={styles.metaItem}>{cert.examCode}</Text>
                <Text className={styles.metaItem}>{STRINGS.FORM_EXAM_DURATION}: {cert.examDuration}</Text>
                <Text className={styles.metaItem}>{STRINGS.FORM_QUESTION_COUNT}: {cert.questionCount}{STRINGS.FORM_QUESTION_SUFFIX}</Text>
                <Text className={styles.metaItem}>{STRINGS.FORM_PASSING_SCORE}: {cert.passingScore}{STRINGS.FORM_SCORE_SUFFIX}</Text>
              </View>
            </View>
          </View>

          <View className={styles.section}>
            <Text className={styles.sectionTitle}>{STRINGS.FORM_PERSONAL_INFO}</Text>
            <FormInput
              label={STRINGS.FORM_REAL_NAME}
              required
              placeholder={STRINGS.FORM_REAL_NAME_PLACEHOLDER}
              value={realName}
              error={errors.realName}
              onChange={setRealName}
            />

            <View className={styles.identityRow}>
              <Text className={styles.identityLabel}>{STRINGS.FORM_IDENTITY_TYPE}</Text>
              <View className={styles.identityToggle}>
                <View
                  className={`${styles.identityOption} ${identityType === 'personal' ? styles.identityActive : ''}`}
                  onClick={() => setIdentityType('personal')}
                >
                  <Text>{STRINGS.FORM_IDENTITY_PERSONAL}</Text>
                </View>
                <View
                  className={`${styles.identityOption} ${identityType === 'enterprise' ? styles.identityActive : ''}`}
                  onClick={() => setIdentityType('enterprise')}
                >
                  <Text>{STRINGS.FORM_IDENTITY_ENTERPRISE}</Text>
                </View>
              </View>
            </View>

            <FormInput
              label={STRINGS.FORM_PHONE}
              required
              placeholder={STRINGS.FORM_PHONE_PLACEHOLDER}
              value={phone}
              type='number'
              maxlength={11}
              error={errors.phone}
              onChange={setPhone}
            />
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
            <FormInput
              label={STRINGS.FORM_EMAIL}
              placeholder={STRINGS.FORM_EMAIL_PLACEHOLDER}
              value={email}
              type='text'
              error={errors.email}
              onChange={setEmail}
            />
            <FormInput
              label={STRINGS.FORM_ID_CARD}
              required
              placeholder={STRINGS.FORM_ID_CARD_PLACEHOLDER}
              value={idCard}
              type='idcard'
              maxlength={18}
              error={errors.idCard}
              onChange={setIdCard}
            />

            <View className={styles.uploadRow}>
              <Text className={styles.uploadLabel}>{STRINGS.FORM_ID_PHOTO}</Text>
              <View className={styles.uploadBox} onClick={handleChooseIdPhoto}>
                <Text className={idPhotoPath ? styles.uploadPath : styles.uploadTip}>
                  {idPhotoPath ? idPhotoPath.split('/').pop() || STRINGS.FORM_ID_PHOTO_TIP : STRINGS.FORM_ID_PHOTO_TIP}
                </Text>
              </View>
            </View>

            <FormInput
              label={STRINGS.FORM_EDUCATION}
              placeholder={STRINGS.FORM_EDUCATION_PLACEHOLDER}
              value={education}
              onChange={setEducation}
            />
            <FormInput
              label={STRINGS.FORM_ORGANIZATION}
              placeholder={STRINGS.FORM_ORGANIZATION_PLACEHOLDER}
              value={organization}
              onChange={setOrganization}
            />

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

            <View className={styles.identityRow}>
              <Text className={styles.identityLabel}>{STRINGS.FORM_COUNTRY}</Text>
              <View className={styles.identityToggle}>
                <View className={`${styles.identityOption} ${country === '中国' ? styles.identityActive : ''}`} onClick={() => setCountry('中国')}>
                  <Text>中国</Text>
                </View>
                <View className={`${styles.identityOption} ${country === '其他' ? styles.identityActive : ''}`} onClick={() => setCountry('其他')}>
                  <Text>其他</Text>
                </View>
              </View>
            </View>

            <View className={styles.identityRow}>
              <Text className={styles.identityLabel}>{STRINGS.FORM_LANGUAGE}</Text>
              <View className={styles.identityToggle}>
                <View className={`${styles.identityOption} ${language === '中文' ? styles.identityActive : ''}`} onClick={() => setLanguage('中文')}>
                  <Text>中文</Text>
                </View>
                <View className={`${styles.identityOption} ${language === 'English' ? styles.identityActive : ''}`} onClick={() => setLanguage('English')}>
                  <Text>English</Text>
                </View>
              </View>
            </View>

            <FormInput
              label={STRINGS.FORM_FIRST_NAME}
              placeholder={STRINGS.FORM_FIRST_NAME_PLACEHOLDER}
              value={firstName}
              onChange={setFirstName}
            />
            <FormInput
              label={STRINGS.FORM_LAST_NAME}
              placeholder={STRINGS.FORM_LAST_NAME_PLACEHOLDER}
              value={lastName}
              onChange={setLastName}
            />
          </View>

          <View className={styles.section}>
            <Text className={styles.sectionTitle}>{STRINGS.FORM_EXAM_PREFERENCE}</Text>
            <View className={styles.uploadRow} onClick={handlePickExamDate}>
              <Text className={styles.uploadLabel}>{STRINGS.FORM_EXAM_DATE}</Text>
              <View className={styles.uploadBox}>
                <Text className={examDate ? styles.uploadPath : styles.uploadTip}>
                  {examDate || STRINGS.FORM_EXAM_DATE_PLACEHOLDER}
                </Text>
              </View>
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
            <Button variant='gradient' size='lg' onClick={handleSubmit}>
              {STRINGS.FORM_SUBMIT}
            </Button>
          </View>
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
