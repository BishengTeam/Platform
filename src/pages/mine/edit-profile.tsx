import { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { FormInput } from '@/components/FormInput'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { STRINGS } from '@/constants/strings'
import { getUserProfile, updateUserProfile } from '@/services/dataService'
import styles from './edit-profile.module.scss'

const MAX_EDITS = 3

const idMap = STRINGS.IDENTITY_STATUS_MAP
const genderMap = STRINGS.GENDER_MAP

export default function EditProfilePage() {
  const [nickname, setNickname] = useState('')
  const [realName, setRealName] = useState('')
  const [idCard, setIdCard] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [gender, setGender] = useState('')
  const [userType, setUserType] = useState('')
  const [education, setEducation] = useState('')
  const [school, setSchool] = useState('')
  const [major, setMajor] = useState('')
  const [organization, setOrganization] = useState('')
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
      setIdentityStatus(profile.identity_status || '')
    }).catch(() => {
      Taro.showToast({ title: '加载失败', icon: 'none' })
    }).finally(() => setLoading(false))
  }, [])

  const isStudent = userType === 'student'
  const remaining = MAX_EDITS - editCount
  const displayIdentityStatus = idMap[identityStatus] || identityStatus || '未认证'

  const handleSave = async () => {
    if (isReadonly) return
    if (remaining <= 0) {
      Taro.showToast({ title: STRINGS.MINE_PROFILE_EDIT_EXHAUSTED, icon: 'none' })
      setIsReadonly(true)
      return
    }
    try {
      await updateUserProfile({
        email,
        gender,
        education,
        ...(isStudent ? { school, major } : { organization }),
      })
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

          {/* 修改次数 Banner */}
          <View className={styles.quotaBanner}>
            <Icon name='info' size={20} color='#1677FF' />
            <Text className={styles.quotaText}>
              {STRINGS.MINE_PROFILE_QUOTA_BANNER.replace('{remaining}', String(remaining)).replace('{max}', String(MAX_EDITS))}
            </Text>
          </View>

          {/* 认证状态 */}
          <View className={styles.identityStatusRow}>
            <Text className={styles.identityStatusLabel}>认证状态</Text>
            <Text className={styles.identityStatusValue}>{displayIdentityStatus}</Text>
          </View>

          <View className={styles.section}>
            <FormInput label='昵称' placeholder='' value={nickname} onChange={setNickname} disabled={isReadonly} />
            <FormInput label={STRINGS.FORM_REAL_NAME} placeholder={STRINGS.FORM_REAL_NAME_PLACEHOLDER} value={realName} onChange={setRealName} disabled={isReadonly} />
            <FormInput label='性别' placeholder='请输入性别' value={genderMap[gender] || gender} onChange={setGender} disabled={isReadonly} />
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

            {/* 安全字段：只读展示 */}
            <FormInput label={STRINGS.FORM_ID_CARD} placeholder='修改需通过实名认证' value={idCard} type='idcard' disabled />
            <FormInput label={STRINGS.FORM_PHONE} placeholder='手机号通过微信授权获取' value={phone} disabled />
            <FormInput label={STRINGS.FORM_EMAIL} placeholder={STRINGS.FORM_EMAIL_PLACEHOLDER} value={email} onChange={setEmail} disabled={isReadonly} />
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
