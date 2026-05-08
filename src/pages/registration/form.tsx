import { useState, useMemo, useCallback } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { FormInput } from '@/components/FormInput'
import { PriceRow } from '@/components/PriceRow'
import { STRINGS } from '@/constants/strings'
import { getCertifications } from '@/services/dataService'
import { validateName, validatePhone, validateIdCard, type ValidationResult } from '@/utils/validator'
import styles from './form.module.scss'

const STORAGE_KEY = 'registration_form_data'

export default function RegistrationFormPage() {
  const [certId, setCertId] = useState('')
  const [realName, setRealName] = useState('')
  const [phone, setPhone] = useState('')
  const [idCard, setIdCard] = useState('')
  const [identityType, setIdentityType] = useState<'personal' | 'enterprise'>('personal')
  const [enterpriseName, setEnterpriseName] = useState('')
  const [useCoupon, setUseCoupon] = useState(false)
  const [errors, setErrors] = useState<Record<string, ValidationResult>>({})

  useLoad((options) => {
    const id = options?.cert_id || ''
    setCertId(id)
  })

  const cert = useMemo(
    () => getCertifications().find(c => c.id === certId),
    [certId],
  )

  const couponCount = 1 // mock: enterprise users have 1 coupon

  const handleValidate = useCallback(() => {
    const next: Record<string, ValidationResult> = {
      realName: validateName(realName),
      phone: validatePhone(phone),
      idCard: validateIdCard(idCard),
    }
    if (identityType === 'enterprise' && !enterpriseName.trim()) {
      next.enterpriseName = { valid: false, message: '请输入企业名称' }
    }
    setErrors(next)
    return Object.values(next).every(v => v.valid)
  }, [realName, phone, idCard, identityType, enterpriseName])

  const handleSubmit = () => {
    if (!cert || !handleValidate()) return

    const formData = {
      cert_id: cert.id,
      cert_name: cert.name,
      real_name: realName.trim(),
      phone: phone.trim(),
      id_card: idCard.trim(),
      identity_type: identityType,
      price: cert.price,
      coupon_count: useCoupon ? 1 : 0,
      enterprise_name: identityType === 'enterprise' ? enterpriseName.trim() : '',
    }

    Taro.setStorageSync(STORAGE_KEY, formData)
    Taro.navigateTo({ url: '/pages/registration/confirm' })
  }

  const couponDiscount = useCoupon ? -cert?.price || 0 : 0
  const totalPrice = (cert?.price || 0) + couponDiscount

  const handleBlur = (field: string) => {
    if (!errors[field]) return
    const val = field === 'realName' ? realName : field === 'phone' ? phone : idCard
    const fn = field === 'realName' ? validateName : field === 'phone' ? validatePhone : validateIdCard
    setErrors(prev => {
      const result = fn(val)
      if (result.valid && !prev[field]?.valid) {
        const next = { ...prev }
        delete next[field]
        return next
      }
      return prev
    })
  }

  if (!cert) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.FORM_TITLE} showBack />
          <View className={styles.empty}>
            <Text>认证项目不存在</Text>
          </View>
        </View>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.FORM_TITLE} showBack />
        <ScrollView className={styles.body} scrollY>
          {/* 认证项目摘要 */}
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>{STRINGS.FORM_CERT_SUMMARY}</Text>
            <View className={styles.summaryCard}>
              <Text className={styles.certName}>{cert.name}</Text>
              <View className={styles.certMeta}>
                <Text className={styles.metaItem}>{STRINGS.FORM_EXAM_DURATION}: {cert.examDuration}</Text>
                <Text className={styles.metaItem}>{STRINGS.FORM_QUESTION_COUNT}: {cert.questionCount}题</Text>
                <Text className={styles.metaItem}>{STRINGS.FORM_PASSING_SCORE}: {cert.passingScore}分</Text>
              </View>
            </View>
          </View>

          {/* 表单区 */}
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>个人信息</Text>
            <FormInput
              label={STRINGS.FORM_REAL_NAME}
              required
              placeholder={STRINGS.FORM_REAL_NAME_PLACEHOLDER}
              value={realName}
              error={errors.realName}
              onChange={setRealName}
              onBlur={() => handleBlur('realName')}
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
              onBlur={() => handleBlur('phone')}
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
              onBlur={() => handleBlur('idCard')}
            />

            {/* 身份类型切换 */}
            <View className={styles.identityRow}>
              <Text className={styles.identityLabel}>
                <Text className={styles.asterisk}>*</Text>
                {STRINGS.FORM_IDENTITY_TYPE}
              </Text>
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

            {/* 企业报名条件显隐 */}
            {identityType === 'enterprise' && (
              <>
                <FormInput
                  label={STRINGS.FORM_ENTERPRISE_NAME}
                  required
                  placeholder={STRINGS.FORM_ENTERPRISE_NAME_PLACEHOLDER}
                  value={enterpriseName}
                  error={errors.enterpriseName}
                  onChange={setEnterpriseName}
                  onBlur={() => {
                    if (!enterpriseName.trim()) return
                    setErrors(prev => {
                      if (!prev.enterpriseName) return prev
                      const next = { ...prev }
                      delete next.enterpriseName
                      return next
                    })
                  }}
                />

                {/* 考试券区块 */}
                {couponCount > 0 && (
                  <View className={styles.couponCard}>
                    <View className={styles.couponRow}>
                      <Text className={styles.couponLabel}>
                        {STRINGS.FORM_COUPON_COUNT}: {couponCount}{STRINGS.FORM_COUPON_COUNT_UNIT}
                      </Text>
                      <View
                        className={`${styles.couponToggle} ${useCoupon ? styles.couponToggleActive : ''}`}
                        onClick={() => setUseCoupon(!useCoupon)}
                      >
                        <View className={`${styles.couponDot} ${useCoupon ? styles.couponDotActive : ''}`} />
                      </View>
                    </View>
                    {useCoupon && (
                      <Text className={styles.couponTip}>使用1张考试券，抵扣考试费</Text>
                    )}
                  </View>
                )}
              </>
            )}
          </View>

          {/* 费用明细 */}
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>{STRINGS.FORM_PRICE_DETAIL}</Text>
            <View className={styles.priceCard}>
              <PriceRow label={STRINGS.FORM_PRICE_EXAM_FEE} value={cert.price} />
              {couponDiscount < 0 && (
                <PriceRow label={STRINGS.FORM_PRICE_COUPON_DISCOUNT} value={couponDiscount} strikethrough />
              )}
              <View className={styles.divider} />
              <PriceRow label={STRINGS.FORM_PRICE_TOTAL} value={totalPrice} isTotal />
            </View>
          </View>

          {/* 提交按钮 */}
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
