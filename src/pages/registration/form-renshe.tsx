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
import { validateName, validatePhone, validateIdCard } from '@/utils/validator'
import type { ValidationResult } from '@/utils/validator'
import styles from './form.module.scss'

const BRANCHES = [STRINGS.RENSHE_BRANCH_NETWORK_SECURITY, STRINGS.RENSHE_BRANCH_BUSINESS_DATA, STRINGS.RENSHE_BRANCH_AI_ENGINEER, STRINGS.RENSHE_BRANCH_IOT_ENGINEER]
const STORAGE_KEY = 'registration_rensh_form'

export default function RensheFormPage() {
  const [certId, setCertId] = useState('')
  const [realName, setRealName] = useState('')
  const [phone, setPhone] = useState('')
  const [idCard, setIdCard] = useState('')
  const [branch, setBranch] = useState('')
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
    }
    if (!branch.trim()) next.branch = { valid: false, message: STRINGS.FORM_RENSHE_BRANCH_PLACEHOLDER }
    setErrors(next)
    return Object.values(next).every(v => v.valid)
  }, [realName, phone, idCard, branch])

  const handleSubmit = () => {
    if (!cert || !handleValidate()) return
    Taro.setStorageSync(STORAGE_KEY, {
      cert_id: cert.id, cert_name: cert.name,
      real_name: realName.trim(), phone: phone.trim(),
      id_card: idCard.trim(), branch, price: cert.price,
    })
    Taro.navigateTo({ url: '/pages/registration/confirm' })
  }

  if (!cert) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.RENSHE_FORM_TITLE} shouldShowBack />
          <View className={styles.empty}><Text>{STRINGS.FORM_ERROR_CERT_NOT_FOUND}</Text></View>
        </View>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.RENSHE_FORM_TITLE} shouldShowBack />
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
            <Text className={styles.sectionTitle}>{STRINGS.FORM_RENSHE_BRANCH}</Text>
            <View className={styles.summaryCard}>
              {BRANCHES.map((b) => (
                <View key={b} className={styles.identityRow}
                  onClick={() => setBranch(b)}
                >
                  <View className={`${styles.identityOption} ${branch === b ? styles.identityActive : ''}`}>
                    <Text>{b}</Text>
                  </View>
                </View>
              ))}
              {errors.branch && <Text className={styles.errorText}>{errors.branch.message}</Text>}
            </View>
          </View>

          <View className={styles.section}>
            <Text className={styles.sectionTitle}>{STRINGS.FORM_PERSONAL_INFO}</Text>
            <FormInput label={STRINGS.FORM_REAL_NAME} required placeholder={STRINGS.FORM_REAL_NAME_PLACEHOLDER} value={realName} error={errors.realName} onChange={setRealName} />
            <FormInput label={STRINGS.FORM_PHONE} required placeholder={STRINGS.FORM_PHONE_PLACEHOLDER} value={phone} type='number' maxlength={11} error={errors.phone} onChange={setPhone} />
            <FormInput label={STRINGS.FORM_ID_CARD} required placeholder={STRINGS.FORM_ID_CARD_PLACEHOLDER} value={idCard} type='idcard' maxlength={18} error={errors.idCard} onChange={setIdCard} />
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
