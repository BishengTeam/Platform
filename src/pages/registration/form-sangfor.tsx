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
import { getCertDetail, createOrder, getUserProfile } from '@/services/dataService'
import type { CertificationDetail } from '@/types'
import { validateName, validatePhone, validateIdCard, validateEmail, validateRequired } from '@/utils/validator'
import type { ValidationResult } from '@/utils/validator'
import styles from './form.module.scss'

const STORAGE_KEY = 'registration_sangfor_form'

export default function SangforFormPage() {
  const [certId, setCertId] = useState('')
  const [realName, setRealName] = useState('')
  const [phone, setPhone] = useState('')
  const [idCard, setIdCard] = useState('')
  const [mailingAddress, setMailingAddress] = useState('')
  const [organization, setOrg] = useState('')
  const [examDirection, setExamDirection] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [examDate, setExamDate] = useState('')
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
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
      mailingAddress: validateRequired(mailingAddress, STRINGS.FORM_MAILING_ADDRESS),
      organization: validateRequired(organization, STRINGS.FORM_ORGANIZATION),
      examDirection: validateRequired(examDirection, STRINGS.FORM_EXAM_DIRECTION),
      verifyCode: validateRequired(verifyCode, STRINGS.FORM_VERIFICATION_CODE),
    }
    if (email.trim()) next.email = validateEmail(email)
    setErrors(next)
    return Object.values(next).every(v => v.valid)
  }, [realName, phone, idCard, mailingAddress, organization, examDirection, verifyCode, email])

  const handleSubmit = async () => {
    if (!cert || !handleValidate()) return
    const order = await createOrder({
      cert_type: 'sangfor',
      candidate_name: realName.trim(),
      candidate_phone: phone.trim(),
      candidate_idcard: idCard.trim(),
      extra_data: {
        mailing_address: mailingAddress.trim(),
        organization: organization.trim(),
        exam_direction: examDirection,
        verification_code: verifyCode.trim(),
        exam_date: examDate || undefined,
        email: email.trim() || undefined,
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
      },
    })

    Taro.navigateTo({ url: `/pages/registration/confirm?order_id=${order.id}` })
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
            <FormInput label={STRINGS.FORM_MAILING_ADDRESS} required placeholder={STRINGS.FORM_MAILING_ADDRESS_PLACEHOLDER} value={mailingAddress} error={errors.mailingAddress} onChange={setMailingAddress} />
            <FormInput label={STRINGS.FORM_ORGANIZATION} required placeholder={STRINGS.FORM_ORGANIZATION_PLACEHOLDER} value={organization} error={errors.organization} onChange={setOrg} />
            <FormInput label={STRINGS.FORM_EXAM_DIRECTION} required placeholder={STRINGS.FORM_EXAM_DIRECTION_PLACEHOLDER} value={examDirection} error={errors.examDirection} onChange={setExamDirection} />
            <FormInput label={STRINGS.FORM_EMAIL} placeholder={STRINGS.FORM_EMAIL_PLACEHOLDER} value={email} error={errors.email} onChange={setEmail} />
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
            <FormInput label={STRINGS.FORM_EXAM_DATE} placeholder={STRINGS.FORM_EXAM_DATE_PLACEHOLDER} value={examDate} onChange={setExamDate} />

            <View className={styles.linkRow}>
              <Text className={styles.linkText}>{'请从深信服官方渠道获取动态验证码'}</Text>
            </View>
            <FormInput label={STRINGS.FORM_VERIFICATION_CODE} required placeholder={STRINGS.FORM_VERIFICATION_CODE_PLACEHOLDER} value={verifyCode} error={errors.verifyCode} onChange={setVerifyCode} />
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