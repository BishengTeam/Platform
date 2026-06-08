import { View, Text } from '@tarojs/components'
import { FormInput } from '@/components/FormInput'
import { STRINGS } from '@/constants/strings'
import type { ValidationResult } from '@/utils/validator'
import styles from './form.module.scss'

export interface SangforExtraSectionProps {
  mailingAddress: string; setMailingAddress: (v: string) => void
  organization: string; setOrganization: (v: string) => void
  examDirection: string; setExamDirection: (v: string) => void
  verifyCode: string; setVerifyCode: (v: string) => void
  examDate: string; setExamDate: (v: string) => void
  email: string; setEmail: (v: string) => void
  firstName: string; setFirstName: (v: string) => void
  lastName: string; setLastName: (v: string) => void
  errors: Record<string, ValidationResult>
}

export function SangforExtraSection(props: SangforExtraSectionProps) {
  const {
    mailingAddress, setMailingAddress,
    organization, setOrganization,
    examDirection, setExamDirection,
    verifyCode, setVerifyCode,
    examDate, setExamDate,
    email, setEmail,
    firstName, setFirstName,
    lastName, setLastName,
    errors,
  } = props

  return (
    <>
      <FormInput label={STRINGS.FORM_MAILING_ADDRESS} required placeholder={STRINGS.FORM_MAILING_ADDRESS_PLACEHOLDER} value={mailingAddress} error={errors.mailingAddress} onChange={setMailingAddress} />
      <FormInput label={STRINGS.FORM_ORGANIZATION} required placeholder={STRINGS.FORM_ORGANIZATION_PLACEHOLDER} value={organization} error={errors.organization} onChange={setOrganization} />
      <FormInput label={STRINGS.FORM_EXAM_DIRECTION} required placeholder={STRINGS.FORM_EXAM_DIRECTION_PLACEHOLDER} value={examDirection} error={errors.examDirection} onChange={setExamDirection} />
      <FormInput label={STRINGS.FORM_EMAIL} placeholder={STRINGS.FORM_EMAIL_PLACEHOLDER} value={email} error={errors.email} onChange={setEmail} />
      <FormInput label={STRINGS.FORM_FIRST_NAME} placeholder={STRINGS.FORM_FIRST_NAME_PLACEHOLDER} value={firstName} onChange={setFirstName} />
      <FormInput label={STRINGS.FORM_LAST_NAME} placeholder={STRINGS.FORM_LAST_NAME_PLACEHOLDER} value={lastName} onChange={setLastName} />
      <FormInput label={STRINGS.FORM_EXAM_DATE} placeholder={STRINGS.FORM_EXAM_DATE_PLACEHOLDER} value={examDate} onChange={setExamDate} />
      <View className={styles.linkRow}>
        <Text className={styles.linkText}>请从深信服官方渠道获取动态验证码</Text>
      </View>
      <FormInput label={STRINGS.FORM_VERIFICATION_CODE} required placeholder={STRINGS.FORM_VERIFICATION_CODE_PLACEHOLDER} value={verifyCode} error={errors.verifyCode} onChange={setVerifyCode} />
    </>
  )
}
