import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { PriceRow } from '@/components/PriceRow'
import { Button } from '@/components/Button'
import { AgreementCheckbox } from '@/components/AgreementCheckbox'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import { mockFormData } from '@/constants/mock'
import type { RegistrationFormData } from '@/types/registration'
import styles from './confirm.module.scss'

const STORAGE_KEY = 'registration_form_data'

export default function ConfirmPage() {
  const [isAgreed, setIsAgreed] = useState(false)
  const [isPaying, setIsPaying] = useState(false)

  const formData: RegistrationFormData = Taro.getStorageSync(STORAGE_KEY) || mockFormData
  const identityLabel = formData.identity_type === 'enterprise' ? STRINGS.FORM_IDENTITY_ENTERPRISE : STRINGS.FORM_IDENTITY_PERSONAL

  const handlePay = () => {
    if (!isAgreed || isPaying) return
    setIsPaying(true)

    setTimeout(() => {
      setIsPaying(false)
      const success = Math.random() > 0.3
      const orderId = `ORD${Date.now()}`
      Taro.navigateTo({
        url: `/${ROUTES.PAYMENT_RESULT}?order_id=${orderId}&status=${success ? 'success' : 'fail'}`,
      })
    }, 1500)
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.CONFIRM_TITLE} shouldShowBack />

        <View className={styles.body}>
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>{STRINGS.CONFIRM_ORDER_INFO}</Text>
            <View className={styles.card}>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>{STRINGS.CONFIRM_CERT_NAME}</Text>
                <Text className={styles.infoValue}>{formData.cert_name}</Text>
              </View>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>{STRINGS.CONFIRM_REAL_NAME}</Text>
                <Text className={styles.infoValue}>{formData.real_name}</Text>
              </View>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>{STRINGS.CONFIRM_PHONE}</Text>
                <Text className={styles.infoValue}>{formData.phone}</Text>
              </View>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>{STRINGS.CONFIRM_ID_CARD}</Text>
                <Text className={styles.infoValue}>{formData.id_card}</Text>
              </View>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>{STRINGS.CONFIRM_IDENTITY}</Text>
                <Text className={styles.infoValue}>{identityLabel}</Text>
              </View>
              {formData.identity_type === 'enterprise' && formData.enterprise_name && (
                <View className={styles.infoRow}>
                  <Text className={styles.infoLabel}>{STRINGS.FORM_ENTERPRISE_NAME}</Text>
                  <Text className={styles.infoValue}>{formData.enterprise_name}</Text>
                </View>
              )}
            </View>
          </View>

          <View className={styles.section}>
            <Text className={styles.sectionTitle}>{STRINGS.FORM_PRICE_DETAIL}</Text>
            <View className={styles.card}>
              <PriceRow label={STRINGS.FORM_PRICE_EXAM_FEE} value={formData.price} size='lg' />
              {formData.coupon_count > 0 && (
                <PriceRow
                  label={`${STRINGS.FORM_PRICE_COUPON_DISCOUNT} (${formData.coupon_count}${STRINGS.FORM_COUPON_COUNT_UNIT})`}
                  value={-formData.price}
                  className={styles.discountRow}
                  size='lg'
                />
              )}
              <PriceRow label={STRINGS.FORM_PRICE_TOTAL} value={formData.price} isTotal size='lg' />
            </View>
          </View>

          <View className={styles.section}>
            <Text className={styles.sectionTitle}>{STRINGS.CONFIRM_PAYMENT_METHOD}</Text>
            <View className={styles.paymentCard}>
              <View className={styles.paymentLeft}>
                <View className={styles.wechatIcon}>W</View>
                <Text className={styles.paymentLabel}>{STRINGS.CONFIRM_PAYMENT_WECHAT}</Text>
              </View>
              <View className={styles.radioOuter}>
                <View className={styles.radioInner} />
              </View>
            </View>
          </View>
        </View>

        <View className={styles.bottomBar}>
          <AgreementCheckbox agreed={isAgreed} onChange={setIsAgreed}>
            {STRINGS.CONFIRM_AGREEMENT_PREFIX}
            <Text className={styles.link}>{STRINGS.CONFIRM_AGREEMENT_TERMS}</Text>
            {STRINGS.AUTH_AGREEMENT_AND}
            <Text className={styles.link}>{STRINGS.CONFIRM_AGREEMENT_PRIVACY}</Text>
          </AgreementCheckbox>
          <Button
            variant='gradient'
            size='lg'
            onClick={handlePay}
            className={`${styles.payBtn} ${isAgreed && !isPaying ? '' : styles.payBtnDisabled}`}
          >
            {isPaying ? STRINGS.CONFIRM_PAYING : `${STRINGS.CONFIRM_PAY_BUTTON} ¥${formData.price.toFixed(2)}`}
          </Button>
        </View>
      </View>
    </AuthGuard>
  )
}
