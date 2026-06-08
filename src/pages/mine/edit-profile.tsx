import { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { FormInput } from '@/components/FormInput'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import { getUserProfile, updateUserProfile } from '@/services/dataService'
import { autoPinyin } from '@/utils/pinyin'
import styles from './edit-profile.module.scss'

const MAX_EDITS = 3

const STATUS_LABELS: Record<string, string> = {
  pending: '审核中',
  verified: '已认证',
  rejected: '未通过',
}

export default function EditProfilePage() {
  const [nickname, setNickname] = useState('')
  const [realName, setRealName] = useState('')
  const [idCard, setIdCard] = useState('')   // 只读展示，修改需走实名认证接口
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [gender, setGender] = useState('')
  const [userType, setUserType] = useState('')
  const [education, setEducation] = useState('')
  const [school, setSchool] = useState('')
  const [major, setMajor] = useState('')
  const [organization, setOrganization] = useState('')
  const [country, setCountry] = useState('中国')
  const [language, setLanguage] = useState('中文')
  const [editCount, setEditCount] = useState(2)
  const [isReadonly, setIsReadonly] = useState(false)
  const [identityStatus, setIdentityStatus] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserProfile().then(profile => {
      setNickname(profile.real_name || '')
      setRealName(profile.real_name || '')
      setIdCard(profile.id_card || '')
      setPhone(profile.phone || '')
      setEmail(profile.email || '')
      setGender(profile.gender || '')
      setUserType(profile.user_type || '')
      setEducation(profile.education || '')
      setSchool(profile.school || '')
      setMajor(profile.major || '')
      setOrganization(profile.organization || '')
      setCountry(profile.country || '中国')
      setLanguage(profile.language || '中文')
      setIdentityStatus(profile.identity_status || '')
    }).catch(() => {
      Taro.showToast({ title: '加载失败', icon: 'none' })
    }).finally(() => {
      setLoading(false)
    })
  }, [])

  const isStudent = userType === 'student'
  const remaining = MAX_EDITS - editCount

  const handleSave = async () => {
    if (isReadonly) return
    if (remaining <= 0) {
      Taro.showToast({ title: STRINGS.MINE_PROFILE_EDIT_EXHAUSTED, icon: 'none' })
      setIsReadonly(true)
      return
    }
    try {
      // id_card 不在后端 UserProfileUpdate 中，仅通过实名认证接口提交
      await updateUserProfile({
        phone,
        email,
        gender,
        education,
        country,
        language,
        ...(isStudent ? { school, major } : { organization }),
      } as any)
    } catch {
      Taro.showToast({ title: '保存失败，请重试', icon: 'none' })
      return
    }
    setEditCount(prev => {
      const next = prev + 1
      if (next >= MAX_EDITS) setIsReadonly(true)
      return next
    })
    Taro.showToast({ title: STRINGS.MINE_PROFILE_SAVE_SUCCESS, icon: 'success' })
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.MINE_EDIT_PROFILE_TITLE} shouldShowBack />
        <ScrollView className={styles.body} scrollY>
          {!loading && (<>
          <View className={styles.editCount}>
            <Text className={styles.editCountText}>
              {STRINGS.MINE_PROFILE_EDIT_COUNT}: {remaining}/{MAX_EDITS}
            </Text>
          </View>

          <View className={styles.editCount}>
            <Text className={styles.editCountText}>
              认证状态: {STATUS_LABELS[identityStatus] || '未认证'}
            </Text>
          </View>

          <View className={styles.section}>
            <FormInput label={STRINGS.FORM_NICKNAME} placeholder='' value={nickname} onChange={setNickname} disabled={isReadonly} />
            <FormInput label={STRINGS.FORM_REAL_NAME} placeholder={STRINGS.FORM_REAL_NAME_PLACEHOLDER} value={realName} onChange={setRealName} disabled={isReadonly} />
            <FormInput label={STRINGS.FORM_ID_CARD} placeholder='修改需通过实名认证' value={idCard} type='idcard' disabled />
            <FormInput label={STRINGS.FORM_PHONE} placeholder={STRINGS.FORM_PHONE_PLACEHOLDER} value={phone} onChange={setPhone} disabled={isReadonly} />
            <FormInput label={STRINGS.FORM_EMAIL} placeholder={STRINGS.FORM_EMAIL_PLACEHOLDER} value={email} onChange={setEmail} disabled={isReadonly} />
            <FormInput label={STRINGS.FORM_GENDER} placeholder='请输入性别' value={gender} onChange={setGender} disabled={isReadonly} />
            <FormInput label={STRINGS.FORM_EDUCATION} placeholder={STRINGS.FORM_EDUCATION_PLACEHOLDER} value={education} onChange={setEducation} disabled={isReadonly} />
            {isStudent && (
              <>
                <FormInput label='学校' placeholder='请输入学校名称' value={school} onChange={setSchool} disabled={isReadonly} />
                <FormInput label={STRINGS.FORM_MAJOR} placeholder={STRINGS.FORM_MAJOR_PLACEHOLDER} value={major} onChange={setMajor} disabled={isReadonly} />
              </>
            )}
            {!isStudent && (
              <FormInput label={STRINGS.FORM_ORGANIZATION} placeholder={STRINGS.FORM_ORGANIZATION_PLACEHOLDER} value={organization} onChange={setOrganization} disabled={isReadonly} />
            )}

            <FormInput label={STRINGS.FORM_COUNTRY} placeholder='中国' value={country} onChange={setCountry} disabled={isReadonly} />
            <FormInput label={STRINGS.FORM_LANGUAGE} placeholder='中文' value={language} onChange={setLanguage} disabled={isReadonly} />

            {/* 推导字段（只读展示） */}
            <FormInput label={STRINGS.FORM_FIRST_NAME} placeholder={realName ? realName.charAt(0) : '-'} value={realName ? realName.charAt(0) : '-'} onChange={() => {}} disabled />
            <FormInput label={STRINGS.FORM_LAST_NAME} placeholder={realName ? realName.slice(1) || '-' : '-'} value={realName ? realName.slice(1) || '-' : '-'} onChange={() => {}} disabled />
            <FormInput label={STRINGS.FORM_PINYIN} placeholder={realName ? autoPinyin(realName) : '-'} value={realName ? autoPinyin(realName) : '-'} onChange={() => {}} disabled />
            <FormInput label={STRINGS.FORM_AGE} placeholder='从身份证自动计算' value={(() => { if (idCard.length < 18) return '-'; const n = new Date(); let a = n.getFullYear() - parseInt(idCard.slice(6, 10)); if (n.getMonth() + 1 < parseInt(idCard.slice(10, 12)) || (n.getMonth() + 1 === parseInt(idCard.slice(10, 12)) && n.getDate() < parseInt(idCard.slice(12, 14)))) a--; return '' + a; })()} onChange={() => {}} disabled />
          </View>

          <View className={styles.btnWrap}>
            <Button variant='gradient' size='lg' onClick={handleSave} disabled={isReadonly}>
              {STRINGS.MINE_PROFILE_SAVE}
            </Button>
          </View>
          </>)}
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
