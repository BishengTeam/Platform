import { useState, useEffect, useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Icon } from '@/components/Icon'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import { getUserProfile } from '@/services/dataService'
import { autoPinyin } from '@/utils/pinyin'
import styles from './personal-info.module.scss'

interface InfoRow {
  label: string
  value: string
  icon: string
}

function maskIdCard(id: string): string {
  if (!id || id.length < 10) return id
  return id.slice(0, 6) + '****' + id.slice(-4)
}

const IDENTITY_STATUS_LABELS: Record<string, string> = {
  pending: '审核中',
  verified: '已认证',
  rejected: '未通过',
}

export default function PersonalInfoPage() {
  const [nickname, setNickname] = useState('')
  const [realName, setRealName] = useState('')
  const [idCard, setIdCard] = useState('')
  const [identityStatus, setIdentityStatus] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [gender, setGender] = useState('')
  const [userType, setUserType] = useState('')
  const [education, setEducation] = useState('')
  const [school, setSchool] = useState('')
  const [major, setMajor] = useState('')
  const [organization, setOrganization] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserProfile().then(profile => {
      setNickname(profile.real_name || '')
      setRealName(profile.real_name || '')
      setIdCard(maskIdCard(profile.id_card || ''))
      setIdentityStatus(IDENTITY_STATUS_LABELS[profile.identity_status || ''] || '未认证')
      setPhone(profile.phone || '')
      setEmail(profile.email || '')
      setGender(profile.gender || '')
      setUserType(profile.user_type || '')
      setEducation(profile.education || '')
      setSchool(profile.school || '')
      setMajor(profile.major || '')
      setOrganization(profile.organization || '')
    }).catch(() => {
      Taro.showToast({ title: '加载失败', icon: 'none' })
    }).finally(() => {
      setLoading(false)
    })
  }, [])

  const isStudent = userType === 'student'

  // 推导字段
  const derived = useMemo(() => {
    const raw = (profileRawIdCard: string) => {
      if (!profileRawIdCard || profileRawIdCard.length < 18) return null
      const by = parseInt(profileRawIdCard.slice(6, 10))
      const bm = parseInt(profileRawIdCard.slice(10, 12))
      const bd = parseInt(profileRawIdCard.slice(12, 14))
      const n = new Date()
      let age = n.getFullYear() - by
      if (n.getMonth() + 1 < bm || (n.getMonth() + 1 === bm && n.getDate() < bd)) age--
      return age > 0 && age < 150 ? `${age}` : null
    }
    const name = realName || ''
    const firstName = name.charAt(0) || '-'
    const lastName = name.slice(1) || '-'
    const pinyin = name ? autoPinyin(name) : '-'
    const ageStr = raw(idCard) || '-'
    return { firstName, lastName, pinyin, ageStr }
  }, [realName, idCard])

  const infoRows: InfoRow[] = [
    { label: STRINGS.FORM_NICKNAME, value: nickname, icon: 'user' },
    { label: STRINGS.FORM_REAL_NAME, value: realName, icon: 'shield' },
    { label: STRINGS.FORM_ID_CARD, value: idCard, icon: 'clipboard' },
    { label: '认证状态', value: identityStatus, icon: 'check-circle' },
    { label: STRINGS.FORM_PHONE, value: phone, icon: 'phone' },
    { label: STRINGS.FORM_EMAIL, value: email, icon: 'mail' },
    { label: STRINGS.FORM_GENDER, value: gender || '-', icon: 'user' },
    { label: STRINGS.FORM_EDUCATION, value: education || '-', icon: 'book' },
    ...(isStudent
      ? [
          { label: '学校', value: school || '-', icon: 'home' },
          { label: STRINGS.FORM_MAJOR, value: major || '-', icon: 'bookmark' },
        ]
      : [
          { label: STRINGS.FORM_ORGANIZATION, value: organization || '-', icon: 'briefcase' },
        ]),
    // 推导字段（只读展示）
    { label: STRINGS.FORM_FIRST_NAME, value: derived.firstName, icon: 'type' },
    { label: STRINGS.FORM_LAST_NAME, value: derived.lastName, icon: 'type' },
    { label: STRINGS.FORM_PINYIN, value: derived.pinyin, icon: 'type' },
    { label: STRINGS.FORM_COUNTRY, value: '中国', icon: 'globe' },
    { label: STRINGS.FORM_LANGUAGE, value: '中文', icon: 'message-circle' },
    { label: STRINGS.FORM_AGE, value: derived.ageStr, icon: 'calendar' },
  ]

  if (loading) return null

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.MINE_PROFILE_TITLE} shouldShowBack />
        <ScrollView className={styles.body} scrollY>
          <View className={styles.card}>
            {infoRows.map((row, index) => (
              <View key={row.label}>
                {index > 0 && <View className={styles.divider} />}
                <View className={styles.infoRow}>
                  <Icon name={row.icon} size={28} color='#666666' />
                  <View className={styles.infoText}>
                    <Text className={styles.infoLabel}>{row.label}</Text>
                    <Text className={styles.infoValue}>{row.value}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View className={styles.btnWrap}>
            <Button variant='gradient' size='lg' onClick={() => Taro.navigateTo({ url: `/${ROUTES.MINE_EDIT_PROFILE}` })}>
              {STRINGS.MINE_EDIT_PROFILE_TITLE}
            </Button>
          </View>
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
