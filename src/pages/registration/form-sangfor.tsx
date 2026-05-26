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
import { validateName, validatePhone, validateIdCard, validateRequired } from '@/utils/validator'
import type { ValidationResult } from '@/utils/validator'
import styles from './form.module.scss'

const STORAGE_KEY = 'registration_sangfor_form'

export default function SangforFormPage() {
  const [certId, setCertId] = useState('')
  const [realName, setRealName] = useState('')
  const [phone, setPhone] = useState('')
  const [idCard, setIdCard] = useState('')
  const [identityType, setIdentityType] = useState<'personal' | 'enterprise'>('personal')
  const [mailingAddress, setMailingAddress] = useState('')
  const [organization, setOrg] = useState('')
  const [examDirection, setExamDirection] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [errors, setErrors] = useState<Record<string, ValidationResult>>({})

  useLoad((options) => {
    setCertId(options?.cert_id || '')
  })

  const cert = useMemo(() => getCertifications().find(c => c.id === certId), [certId])

  const handleValidate = useCallback(() => {
    const next: Record<string, ValidationResult> = {
      realName: validateName(realName),
      phone: validatePhone(phone),
      idCard: validateIdCard(idCard),
      mailingAddress: validateRequired(mailingAddress, STRINGS.FORM_MAILING_ADDRESS),
      organization: validateRequired(organization, STRINGS.FORM_ORGANIZATION),
      examDirection: validateRequired(examDirection, STRINGS.FORM_EXAM_DIRECTION),
      verifyCode: validateRequired(verifyCode, STRINGS.FORM_VERIFICATION_CODE),
    }
    setErrors(next)
    return Object.values(next).every(v => v.valid)
  }, [realName, phone, idCard, mailingAddress, organization, examDirection, verifyCode])

  const handleSubmit = () => {
    if (!cert || !handleValidate()) return
    Taro.setStorageSync(STORAGE_KEY, {
      cert_id: cert.id, cert_name: cert.name,
      real_name: realName.trim(), phone: phone.trim(), id_card: idCard.trim(),
      identity_type: identityType, price: cert.price,
      mailing_address: mailingAddress.trim(), organization: organization.trim(),
      exam_direction: examDirection, verification_code: verifyCode.trim(),
    })
    Taro.navigateTo({ url: '/pages/registration/confirm' })
  }

  if (!cert) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.SANGFOR_FORM_TITLE} shouldShowBack />
          <View className={styles.empty}><Text>{STRINGS.FORM_ERROR_CERT_NOT_FOUND}</Text></View>
        </View>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.SANGFOR_FORM_TITLE} shouldShowBack />
        <ScrollView className={styles.body} scrollY>
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>{STRINGS.FORM_CERT_SUMMARY}</Text>
            <View className={styles.summaryCard}>
              <Text className={styles.certName}>{cert.name}</Text>
              <View className={styles.certMeta}>
                <Text className={styles.metaItem}>{STRINGS.FORM_EXAM_DURATION}: {cert.examDuration}</Text>
                <Text className={styles.metaItem}>{cert.examCode}</Text>
              </View>
            </View>
          </View>

          <View className={styles.section}>
            <Text className={styles.sectionTitle}>{STRINGS.FORM_PERSONAL_INFO}</Text>
            <FormInput label={STRINGS.FORM_REAL_NAME} required placeholder={STRINGS.FORM_REAL_NAME_PLACEHOLDER} value={realName} error={errors.realName} onChange={setRealName} />
            <FormInput label={STRINGS.FORM_PHONE} required placeholder={STRINGS.FORM_PHONE_PLACEHOLDER} value={phone} type='number' maxlength={11} error={errors.phone} onChange={setPhone} />
            <FormInput label={STRINGS.FORM_ID_CARD} required placeholder={STRINGS.FORM_ID_CARD_PLACEHOLDER} value={idCard} type='idcard' maxlength={18} error={errors.idCard} onChange={setIdCard} />
            <FormInput label={STRINGS.FORM_MAILING_ADDRESS} required placeholder={STRINGS.FORM_MAILING_ADDRESS_PLACEHOLDER} value={mailingAddress} error={errors.mailingAddress} onChange={setMailingAddress} />
            <FormInput label={STRINGS.FORM_ORGANIZATION} required placeholder={STRINGS.FORM_ORGANIZATION_PLACEHOLDER} value={organization} error={errors.organization} onChange={setOrg} />
            <FormInput label={STRINGS.FORM_EXAM_DIRECTION} required placeholder={STRINGS.FORM_EXAM_DIRECTION_PLACEHOLDER} value={examDirection} error={errors.examDirection} onChange={setExamDirection} />
            <FormInput label={STRINGS.FORM_VERIFICATION_CODE} required placeholder={STRINGS.FORM_VERIFICATION_CODE_PLACEHOLDER} value={verifyCode} error={errors.verifyCode} onChange={setVerifyCode} />

            <View className={styles.identityRow}>
              <Text className={styles.identityLabel}><Text className={styles.asterisk}>*</Text>{STRINGS.FORM_IDENTITY_TYPE}</Text>
              <View className={styles.identityToggle}>
                <View className={`${styles.identityOption} ${identityType === 'personal' ? styles.identityActive : ''}`} onClick={() => setIdentityType('personal')}>
                  <Text>{STRINGS.FORM_IDENTITY_PERSONAL}</Text>
                </View>
                <View className={`${styles.identityOption} ${identityType === 'enterprise' ? styles.identityActive : ''}`} onClick={() => setIdentityType('enterprise')}>
                  <Text>{STRINGS.FORM_IDENTITY_ENTERPRISE}</Text>
                </View>
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

          <Text className={styles.couponTip}>{STRINGS.FORM_SANGFOR_COUPON_TIP}</Text>

          <View className={styles.btnWrap}>
            <Button variant='gradient' size='lg' onClick={handleSubmit}>{STRINGS.FORM_SUBMIT}</Button>
          </View>
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
