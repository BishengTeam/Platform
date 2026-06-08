import type { ReactNode } from 'react'
import { View, Text, Button as TaroButton } from '@tarojs/components'
import { FormInput } from '@/components/FormInput'
import { STRINGS } from '@/constants/strings'
import type { ValidationResult } from '@/utils/validator'
import styles from '../form.module.scss'

interface Props {
  realName: string
  setRealName: (v: string) => void
  phone: string
  setPhone: (v: string) => void
  idCard: string
  setIdCard: (v: string) => void
  errors: Record<string, ValidationResult>
  /** 微信手机号解密状态 */
  decrypting: boolean
  /** 微信手机号授权回调 */
  handleGetPhoneNumber: (e: { detail: { encryptedData?: string; iv?: string; errMsg?: string } }) => Promise<string | null>
  /** 插入在姓名后面的额外内容（如身份类型切换） */
  afterRealName?: ReactNode
}

/**
 * 基础信息区域 — 所有认证类型共用
 * 包含：真实姓名、手机号（含微信一键授权）、身份证号
 */
export function BaseInfoSection({
  realName, setRealName,
  phone, setPhone,
  idCard, setIdCard,
  errors,
  decrypting, handleGetPhoneNumber,
  afterRealName,
}: Props) {
  return (
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
      {afterRealName}
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
        label={STRINGS.FORM_ID_CARD}
        required
        placeholder={STRINGS.FORM_ID_CARD_PLACEHOLDER}
        value={idCard}
        type='idcard'
        maxlength={18}
        error={errors.idCard}
        onChange={setIdCard}
      />
    </View>
  )
}
