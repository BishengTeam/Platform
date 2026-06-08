import { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Icon } from '@/components/Icon'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import { getUserProfile } from '@/services/dataService'
import styles from './personal-info.module.scss'

interface InfoRow {
  label: string
  value: string
  icon: string
}

const idMap = STRINGS.IDENTITY_STATUS_MAP
const genderMap = STRINGS.GENDER_MAP

/** 认证状态 → 标签样式类名 */
function statusClass(s: string): string {
  if (s === 'verified') return styles.statusVerified
  if (s === 'rejected') return styles.statusRejected
  return styles.statusPending
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
      setIdCard(profile.id_card || '')
      setIdentityStatus(profile.identity_status || '')
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
    }).finally(() => setLoading(false))
  }, [])

  const isStudent = userType === 'student'
  const displayGender = genderMap[gender] || gender || '-'
  const displayStatus = idMap[identityStatus] || identityStatus || '未认证'

  const identityRows: InfoRow[] = [
    { label: '昵称', value: nickname, icon: 'user' },
    { label: '真实姓名', value: realName, icon: 'shield' },
    { label: '性别', value: displayGender, icon: 'user' },
  ]

  const securityRows: InfoRow[] = [
    { label: '身份证号', value: idCard, icon: 'clipboard' },
    { label: '手机号', value: phone, icon: 'phone' },
    { label: '邮箱', value: email || '-', icon: 'mail' },
  ]

  const affiliationRows: InfoRow[] = isStudent
    ? [
        { label: '学校', value: school || '-', icon: 'home' },
        { label: '专业', value: major || '-', icon: 'bookmark' },
        { label: '学历', value: education || '-', icon: 'book' },
      ]
    : [
        { label: '单位', value: organization || '-', icon: 'briefcase' },
        { label: '学历', value: education || '-', icon: 'book' },
      ]

  const renderCard = (title: string, rows: InfoRow[], icon: string) => (
    <View className={styles.card}>
      <View className={styles.cardHead}>
        <Icon name={icon} size={22} color='#333' />
        <Text className={styles.cardTitle}>{title}</Text>
      </View>
      {rows.map((row, i) => (
        <View key={row.label}>
          {i > 0 && <View className={styles.divider} />}
          <View className={styles.infoRow}>
            <View className={styles.infoText}>
              <Text className={styles.infoLabel}>{row.label}</Text>
              <Text className={styles.infoValue}>{row.value}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  )

  if (loading) return null

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.MINE_PROFILE_TITLE} shouldShowBack />
        <ScrollView className={styles.body} scrollY>

          {/* 认证状态标签 */}
          <View className={styles.statusBar}>
            <View className={`${styles.statusBadge} ${statusClass(identityStatus)}`}>
              <Text className={styles.statusText}>{displayStatus}</Text>
            </View>
          </View>

          {/* 卡片 A：核心身份 */}
          {renderCard('核心身份', identityRows, 'user')}

          {/* 卡片 B：认证与安全 */}
          {renderCard('认证与安全', securityRows, 'lock')}

          {/* 卡片 C：组织背景 */}
          {renderCard(isStudent ? '教育背景' : '组织背景', affiliationRows, isStudent ? 'book' : 'briefcase')}

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
