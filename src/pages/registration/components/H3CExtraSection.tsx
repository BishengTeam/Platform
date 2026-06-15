import { View, Text } from '@tarojs/components'
import { FormInput } from '@/components/FormInput'
import { FormPicker } from '@/components/FormPicker'
import { STRINGS } from '@/constants/strings'
import type { ValidationResult } from '@/utils/validator'
import styles from '../form.module.scss'

export interface H3CExtraSectionProps {
  identityType: 'personal' | 'enterprise'
  setIdentityType: (v: 'personal' | 'enterprise') => void
  email: string; setEmail: (v: string) => void
  idPhotoPath: string
  education: string; setEducation: (v: string) => void
  organization: string; setOrganization: (v: string) => void
  examDate: string
  gender: string; setGender: (v: string) => void
  country: string; setCountry: (v: string) => void
  language: string; setLanguage: (v: string) => void
  firstName: string; setFirstName: (v: string) => void
  lastName: string; setLastName: (v: string) => void
  errors: Record<string, ValidationResult>
  onChooseIdPhoto: () => void
  onPickExamDate: () => void
}

export function H3CExtraSection(props: H3CExtraSectionProps) {
  const {
    identityType, setIdentityType,
    email, setEmail,
    idPhotoPath,
    education, setEducation,
    organization, setOrganization,
    examDate,
    gender, setGender,
    country, setCountry,
    language, setLanguage,
    firstName, setFirstName,
    lastName, setLastName,
    errors, onChooseIdPhoto, onPickExamDate,
  } = props

  return (
    <>
      {/* 身份类型 */}
      <View className={styles.identityRow}>
        <Text className={styles.identityLabel}>{STRINGS.FORM_IDENTITY_TYPE}</Text>
        <View className={styles.identityToggle}>
          <View className={`${styles.identityOption} ${identityType === 'personal' ? styles.identityActive : ''}`} onClick={() => setIdentityType('personal')}>
            <Text>{STRINGS.FORM_IDENTITY_PERSONAL}</Text>
          </View>
          <View className={`${styles.identityOption} ${identityType === 'enterprise' ? styles.identityActive : ''}`} onClick={() => setIdentityType('enterprise')}>
            <Text>{STRINGS.FORM_IDENTITY_ENTERPRISE}</Text>
          </View>
        </View>
      </View>

      <FormInput label={STRINGS.FORM_EMAIL} placeholder={STRINGS.FORM_EMAIL_PLACEHOLDER} value={email} error={errors.email} onChange={setEmail} />

      {/* 证件照上传 */}
      <View className={styles.uploadRow}>
        <Text className={styles.uploadLabel}>{STRINGS.FORM_ID_PHOTO}</Text>
        <View className={styles.uploadBox} onClick={onChooseIdPhoto}>
          <Text className={idPhotoPath ? styles.uploadPath : styles.uploadTip}>
            {idPhotoPath ? idPhotoPath.split('/').pop() || STRINGS.FORM_ID_PHOTO_TIP : STRINGS.FORM_ID_PHOTO_TIP}
          </Text>
        </View>
      </View>

      <FormPicker
        label={STRINGS.FORM_EDUCATION}
        placeholder={STRINGS.FORM_EDUCATION_PLACEHOLDER}
        value={education}
        options={STRINGS.EDUCATION_OPTIONS}
        onChange={setEducation}
      />
      <FormInput label={STRINGS.FORM_ORGANIZATION} placeholder={STRINGS.FORM_ORGANIZATION_PLACEHOLDER} value={organization} onChange={setOrganization} />

      {/* 考试偏好 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>{STRINGS.FORM_EXAM_PREFERENCE}</Text>

        {/* 性别 */}
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

        {/* 国家 */}
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

        {/* 语言 */}
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

        <FormInput label={STRINGS.FORM_FIRST_NAME} placeholder={STRINGS.FORM_FIRST_NAME_PLACEHOLDER} value={firstName} onChange={setFirstName} />
        <FormInput label={STRINGS.FORM_LAST_NAME} placeholder={STRINGS.FORM_LAST_NAME_PLACEHOLDER} value={lastName} onChange={setLastName} />

        <View className={styles.uploadRow} onClick={onPickExamDate}>
          <Text className={styles.uploadLabel}>{STRINGS.FORM_EXAM_DATE}</Text>
          <View className={styles.uploadBox}>
            <Text className={examDate ? styles.uploadPath : styles.uploadTip}>
              {examDate || STRINGS.FORM_EXAM_DATE_PLACEHOLDER}
            </Text>
          </View>
        </View>
      </View>
    </>
  )
}