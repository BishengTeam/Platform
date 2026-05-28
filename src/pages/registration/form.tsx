import { useState, useMemo, useCallback } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useLoad, useDidShow } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { FormInput } from '@/components/FormInput'
import { PriceRow } from '@/components/PriceRow'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import { getCertifications } from '@/services/dataService'
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
  const [identityType, setIdentityType] = useState<'personal' | 'student' | 'enterprise'>('personal')
  const [xuexinCode, setXuexinCode] = useState('')
  const [studentProofPath, setStudentProofPath] = useState('')
  const [enterpriseName, setEnterpriseName] = useState('')
  const [batchCount, setBatchCount] = useState('1')
  const [isCouponActive, setUseCoupon] = useState(false)
  const [errors, setErrors] = useState<Record<string, ValidationResult>>({})

  useLoad((options) => {
    setCertId(options?.cert_id || '')
  })

  useDidShow(() => {
    const storedCode = Taro.getStorageSync('xuexin_verification_code')
    if (storedCode) {
      setXuexinCode(storedCode)
      Taro.removeStorageSync('xuexin_verification_code')
    }
  })

  const cert = useMemo(() => getCertifications().find(c => c.id === certId), [certId])

  const couponCount = 1

  const handleValidate = useCallback(() => {
    const next: Record<string, ValidationResult> = {
      realName: validateName(realName),
      phone: validatePhone(phone),
      idCard: validateIdCard(idCard),
    }
    if (email.trim()) next.email = validateEmail(email)
    if (identityType === 'enterprise' && !enterpriseName.trim()) {
      next.enterpriseName = { valid: false, message: STRINGS.FORM_VALID_ENTERPRISE_NAME }
    }
    if (identityType === 'student' && !xuexinCode.trim()) {
      next.xuexinCode = { valid: false, message: STRINGS.VALIDATOR_VERIFICATION_REQUIRED }
    }
    setErrors(next)
    return Object.values(next).every(v => v.valid)
  }, [realName, phone, idCard, email, identityType, enterpriseName, xuexinCode])

  const handleSubmit = () => {
    if (!cert || !handleValidate()) return

    const formData = {
      cert_id: cert.id,
      cert_name: cert.name,
      real_name: realName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      id_card: idCard.trim(),
      id_photo: idPhotoPath,
      education: education.trim(),
      organization: organization.trim(),
      identity_type: identityType,
      exam_date: examDate,
      price: cert.price,
      batch_count: identityType === 'enterprise' ? Number(batchCount) || 1 : 1,
      coupon_count: isCouponActive ? 1 : 0,
      enterprise_name: identityType === 'enterprise' ? enterpriseName.trim() : '',
      xuexin_code: identityType === 'student' ? xuexinCode.trim() : '',
      student_proof: identityType === 'student' ? studentProofPath : '',
    }

    Taro.setStorageSync(STORAGE_KEY, formData)
    Taro.navigateTo({ url: '/pages/registration/confirm' })
  }

  const handleChooseIdPhoto = () => {
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => setIdPhotoPath(res.tempFilePaths[0]),
    })
  }

  const handleChooseStudentProof = () => {
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => setStudentProofPath(res.tempFilePaths[0]),
    })
  }

  const handleGoXuexinGuide = () => {
    Taro.navigateTo({ url: `/pages/registration/xuexin-guide` })
  }

  const handlePickExamDate = () => {
    Taro.showToast({ title: '请选择考试日期', icon: 'none' })
  }

  const batchMultiplier = identityType === 'enterprise' ? (Number(batchCount) || 1) : 1
  const couponDiscount = isCouponActive && cert ? -cert.price : 0
  const totalPrice = cert ? cert.price * batchMultiplier + couponDiscount : 0

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
          </View>

          <View className={styles.section}>
            <Text className={styles.sectionTitle}>{STRINGS.FORM_IDENTITY_TYPE}</Text>
            <View className={styles.identityTriple}>
              <View
                className={`${styles.identityOption} ${identityType === 'personal' ? styles.identityActive : ''}`}
                onClick={() => setIdentityType('personal')}
              >
                <Text>{STRINGS.FORM_IDENTITY_PERSONAL}</Text>
              </View>
              <View
                className={`${styles.identityOption} ${identityType === 'student' ? styles.identityActive : ''}`}
                onClick={() => setIdentityType('student')}
              >
                <Text>{STRINGS.FORM_IDENTITY_STUDENT}</Text>
              </View>
              <View
                className={`${styles.identityOption} ${identityType === 'enterprise' ? styles.identityActive : ''}`}
                onClick={() => setIdentityType('enterprise')}
              >
                <Text>{STRINGS.FORM_IDENTITY_ENTERPRISE}</Text>
              </View>
            </View>

            {identityType === 'student' && (
              <View className={styles.subSection}>
                <FormInput
                  label={STRINGS.FORM_STUDENT_VERIFY}
                  required
                  placeholder={STRINGS.FORM_STUDENT_VERIFY_PLACEHOLDER}
                  value={xuexinCode}
                  error={errors.xuexinCode}
                  onChange={setXuexinCode}
                />
                <View className={styles.linkRow}>
                  <Text className={styles.linkText} onClick={handleGoXuexinGuide}>
                    {STRINGS.FORM_XUEXIN_LINK_TEXT}
                  </Text>
                </View>
                <View className={styles.uploadRow}>
                  <Text className={styles.uploadLabel}>{STRINGS.FORM_STUDENT_ID_PHOTO}</Text>
                  <View className={styles.uploadBox} onClick={handleChooseStudentProof}>
                    <Text className={studentProofPath ? styles.uploadPath : styles.uploadTip}>
                      {studentProofPath ? studentProofPath.split('/').pop() || STRINGS.FORM_STUDENT_ID_PHOTO_TIP : STRINGS.FORM_STUDENT_ID_PHOTO_TIP}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {identityType === 'enterprise' && (
              <View className={styles.subSection}>
                <FormInput
                  label={STRINGS.FORM_ENTERPRISE_NAME}
                  required
                  placeholder={STRINGS.FORM_ENTERPRISE_NAME_PLACEHOLDER}
                  value={enterpriseName}
                  error={errors.enterpriseName}
                  onChange={setEnterpriseName}
                />
                <FormInput
                  label={STRINGS.FORM_BATCH_COUNT}
                  placeholder='1'
                  value={batchCount}
                  type='number'
                  onChange={setBatchCount}
                />

                {couponCount > 0 && (
                  <View className={styles.couponCard}>
                    <View className={styles.couponRow}>
                      <Text className={styles.couponLabel}>
                        {STRINGS.FORM_COUPON_COUNT}: {couponCount}{STRINGS.FORM_COUPON_COUNT_UNIT}
                      </Text>
                      <View
                        className={`${styles.couponToggle} ${isCouponActive ? styles.couponToggleActive : ''}`}
                        onClick={() => setUseCoupon(!isCouponActive)}
                      >
                        <View className={`${styles.couponDot} ${isCouponActive ? styles.couponDotActive : ''}`} />
                      </View>
                    </View>
                    {isCouponActive && (
                      <Text className={styles.couponTip}>{STRINGS.FORM_COUPON_TIP}</Text>
                    )}
                  </View>
                )}
              </View>
            )}
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
              {batchMultiplier > 1 && (
                <PriceRow label={`${STRINGS.FORM_BATCH_COUNT} × ${batchMultiplier}`} value={cert.price * batchMultiplier} />
              )}
              {couponDiscount < 0 && (
                <PriceRow label={STRINGS.FORM_PRICE_COUPON_DISCOUNT} value={couponDiscount} isStrikethrough />
              )}
              <View className={styles.divider} />
              <PriceRow label={STRINGS.FORM_PRICE_TOTAL} value={totalPrice} isTotal />
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
