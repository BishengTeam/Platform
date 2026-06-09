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
import type { UserProfileAggregated } from '@/types/profile'
import styles from './edit-profile.module.scss'

const idMap = STRINGS.IDENTITY_STATUS_MAP

export default function EditProfilePage() {
  const [profile, setProfile] = useState<UserProfileAggregated | null>(null)
  // Level 1 — 可编辑
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  // Level 2 — 只读展示
  const [level2EditCount, setLevel2EditCount] = useState(0)
  const [isReadonly, setIsReadonly] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserProfile().then(p => {
      setProfile(p)
      setNickname(p.profile.nickname || '')
      setEmail(p.profile.email || '')
      setPhone(p.profile.phone || '')
      setLevel2EditCount(p.level2_edit_count)
    }).catch(() => {
      Taro.showToast({ title: '加载失败', icon: 'none' })
    }).finally(() => setLoading(false))
  }, [])

  if (loading || !profile) return null

  const { realname, student, enterprise } = profile
  const isStudent = realname.user_type === 'student'
  const displayIdentityStatus = idMap[realname.status || ''] || realname.status || '未认证'
  const isIdCardDisabled = realname.status === 'verified' || realname.status === 'pending'

  const handleSave = async () => {
    if (isReadonly) return
    try {
      await updateUserProfile({ nickname: nickname.trim() || undefined, email: email.trim() || undefined, phone: phone.trim() || undefined })
    } catch {
      Taro.showToast({ title: '保存失败，请重试', icon: 'none' })
      return
    }
    Taro.showToast({ title: STRINGS.MINE_PROFILE_SAVE_SUCCESS, icon: 'success' })
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.MINE_EDIT_PROFILE_TITLE} shouldShowBack />
        <ScrollView className={styles.body} scrollY>
          {/* 认证状态 */}
          <View className={styles.identityStatusRow}>
            <Text className={styles.identityStatusLabel}>认证状态</Text>
            <Text className={styles.identityStatusValue}>{displayIdentityStatus}</Text>
          </View>

          <View className={styles.section}>
            {/* Level 1 — 可编辑 */}
            <FormInput label='昵称' placeholder='请输入昵称' value={nickname} onChange={setNickname} disabled={isReadonly} />
            <FormInput label={STRINGS.FORM_EMAIL} placeholder={STRINGS.FORM_EMAIL_PLACEHOLDER} value={email} onChange={setEmail} disabled={isReadonly} />
            <FormInput label={STRINGS.FORM_PHONE} placeholder='手机号通过微信授权获取' value={phone} disabled />

            {/* Level 2 — 只读展示 */}
            <FormInput label={STRINGS.FORM_REAL_NAME} placeholder='-' value={realname.real_name || ''} disabled />
            <FormInput label={STRINGS.FORM_ID_CARD} placeholder={isIdCardDisabled ? '修改需通过实名认证' : '-'} value={realname.id_card_number || ''} type='idcard' disabled />
            <FormInput label='性别' placeholder='-' value={realname.gender || ''} disabled />
            <FormInput label='年龄' placeholder='-' value={realname.age != null ? String(realname.age) : ''} disabled />
            {isStudent && (
              <>
                <FormInput label={STRINGS.FORM_EDUCATION} placeholder='-' value={student?.education || ''} disabled />
                <FormInput label='学校' placeholder='-' value={student?.school || ''} disabled />
                <FormInput label={STRINGS.FORM_MAJOR} placeholder='-' value={student?.major || ''} disabled />
              </>
            )}
            {!isStudent && (
              <FormInput label={STRINGS.FORM_ORGANIZATION} placeholder='-' value={enterprise?.organization || ''} disabled />
            )}
          </View>

          {/* L2 说明 */}
          <View className={styles.quotaBanner}>
            <Icon name='info' size={20} color='#1677FF' />
            <Text className={styles.quotaText}>{STRINGS.MINE_PROFILE_EDIT_TIP}</Text>
          </View>

          <View className={styles.btnWrap}>
            <Button variant='gradient' size='lg' onClick={handleSave} disabled={isReadonly}>
              {STRINGS.MINE_PROFILE_SAVE}
            </Button>
          </View>
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
