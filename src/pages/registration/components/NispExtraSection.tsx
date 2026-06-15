import { View, Text } from '@tarojs/components'
import { FormInput } from '@/components/FormInput'
import { FormPicker } from '@/components/FormPicker'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import type { ValidationResult } from '@/utils/validator'
import styles from '../form.module.scss'

export interface NispExtraSectionProps {
  email: string; setEmail: (v: string) => void
  school: string; setSchool: (v: string) => void
  major: string; setMajor: (v: string) => void
  province: string; setProvince: (v: string) => void
  level: '1' | '2'; setLevel: (v: '1' | '2') => void
  gender: 'male' | 'female'; setGender: (v: 'male' | 'female') => void
  age: string; setAge: (v: string) => void
  education: string; setEducation: (v: string) => void
  address: string; setAddress: (v: string) => void
  zipCode: string; setZipCode: (v: string) => void
  pinyin: string
  trainingType: string
  portraitPhotoPath: string; idPhotoPath: string; xuexinReportPath: string
  templatePath: string
  errors: Record<string, ValidationResult>
  onUpload: (target: 'portrait' | 'idPhoto' | 'xuexin' | 'template') => void
  onDownloadTemplate: () => void
}

export function NispExtraSection(props: NispExtraSectionProps) {
  const {
    email, setEmail, school, setSchool, major, setMajor, province, setProvince,
    level, setLevel, gender, setGender, age, setAge,
    education, setEducation, address, setAddress, zipCode, setZipCode,
    pinyin, trainingType,
    portraitPhotoPath, idPhotoPath, xuexinReportPath,
    templatePath, errors,
    onUpload, onDownloadTemplate,
  } = props

  return (
    <>
      <FormInput label={STRINGS.FORM_PINYIN} placeholder={pinyin} value={pinyin} onChange={() => {}} />
      <FormInput label={STRINGS.FORM_EMAIL} required placeholder={STRINGS.FORM_EMAIL_PLACEHOLDER} value={email} error={errors.email} onChange={setEmail} />
      <FormInput label={STRINGS.FORM_SCHOOL} required placeholder={STRINGS.FORM_SCHOOL_PLACEHOLDER} value={school} error={errors.school} onChange={setSchool} />
      <FormInput label={STRINGS.FORM_MAJOR} required placeholder={STRINGS.FORM_MAJOR_PLACEHOLDER} value={major} error={errors.major} onChange={setMajor} />
      <FormInput label={STRINGS.FORM_PROVINCE} required placeholder={STRINGS.FORM_PROVINCE_PLACEHOLDER} value={province} error={errors.province} onChange={setProvince} />

      {/* 级别切换 */}
      <View className={styles.identityRow}>
        <Text className={styles.identityLabel}>{STRINGS.NISP_LEVEL}</Text>
        <View className={styles.identityToggle}>
          <View className={`${styles.identityOption} ${level === '1' ? styles.identityActive : ''}`} onClick={() => setLevel('1')}>
            <Text>{STRINGS.NISP_LEVEL_1}</Text>
          </View>
          <View className={`${styles.identityOption} ${level === '2' ? styles.identityActive : ''}`} onClick={() => setLevel('2')}>
            <Text>{STRINGS.NISP_LEVEL_2}</Text>
          </View>
        </View>
      </View>

      {/* 二级额外字段 */}
      {level === '2' && (
        <>
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
          <FormInput label={STRINGS.FORM_AGE} placeholder={STRINGS.FORM_AGE_PLACEHOLDER} value={age} type='number' maxlength={2} onChange={setAge} />
          <FormPicker
            label={STRINGS.FORM_EDUCATION}
            placeholder={STRINGS.FORM_EDUCATION_PLACEHOLDER}
            value={education}
            options={STRINGS.EDUCATION_OPTIONS}
            onChange={setEducation}
          />
          <FormInput label={STRINGS.FORM_ADDRESS} placeholder={STRINGS.FORM_ADDRESS_PLACEHOLDER} value={address} onChange={setAddress} />
          <FormInput label={STRINGS.FORM_ZIP_CODE} placeholder={STRINGS.FORM_ZIP_CODE_PLACEHOLDER} value={zipCode} type='number' maxlength={6} onChange={setZipCode} />
          <FormInput label={STRINGS.FORM_INSTITUTION} placeholder='' value={STRINGS.NISP_INSTITUTION_DEFAULT} onChange={() => {}} />
        </>
      )}

      {/* 上传区域 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>{STRINGS.FORM_UPLOAD_MATERIALS}</Text>
        <View className={styles.summaryCard}>
          <Text className={styles.metaItem}>{level === '1' ? STRINGS.FORM_PORTRAIT_PHOTO_TIP_NISP1 : STRINGS.FORM_PORTRAIT_PHOTO_TIP_NISP2}</Text>
          <View className={styles.btnWrap}><Button variant='secondary' size='md' onClick={() => onUpload('portrait')}>{STRINGS.FORM_UPLOAD_PORTRAIT_PHOTO}</Button></View>
          <Text className={styles.metaItem}>{STRINGS.FORM_ID_PHOTO_TIP_NISP}</Text>
          <View className={styles.btnWrap}><Button variant='secondary' size='md' onClick={() => onUpload('idPhoto')}>{STRINGS.FORM_UPLOAD_ID_PHOTO}</Button></View>
          <Text className={styles.metaItem}>{STRINGS.FORM_XUEXIN_REPORT_TIP}</Text>
          <View className={styles.btnWrap}><Button variant='secondary' size='md' onClick={() => onUpload('xuexin')}>{STRINGS.FORM_UPLOAD_XUEXIN_REPORT}</Button></View>
          {level === '2' && (
            <>
              <View className={styles.btnWrap}><Button variant='secondary' size='md' onClick={onDownloadTemplate}>{STRINGS.FORM_TEMPLATE_DOWNLOAD}</Button></View>
              <View className={styles.btnWrap}><Button variant='secondary' size='md' onClick={() => onUpload('template')}>{STRINGS.FORM_TEMPLATE_UPLOAD}</Button></View>
            </>
          )}
        </View>
      </View>
    </>
  )
}
