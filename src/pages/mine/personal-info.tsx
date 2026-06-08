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
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [realName, setRealName] = useState('')
  const [idCard, setIdCard] = useState('')
  const [identityStatus, setIdentityStatus] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserProfile().then(profile => {
      // nickname 已从后端 UserProfile 移除，使用 real_name 作为显示名
      setNickname(profile.real_name || '')
      setPhone(profile.phone || '')
      setEmail(profile.email || '')
      setRealName(profile.real_name || '')
      setIdCard(maskIdCard(profile.id_card || ''))
      setIdentityStatus(IDENTITY_STATUS_LABELS[profile.identity_status || ''] || '未认证')
    }).catch(() => {
      Taro.showToast({ title: '加载失败', icon: 'none' })
    }).finally(() => {
      setLoading(false)
    })
  }, [])

  const infoRows: InfoRow[] = [
    { label: STRINGS.FORM_NICKNAME, value: nickname, icon: 'user' },
    { label: STRINGS.FORM_REAL_NAME, value: realName, icon: 'shield' },
    { label: STRINGS.FORM_ID_CARD, value: idCard, icon: 'clipboard' },
    { label: '认证状态', value: identityStatus, icon: 'check-circle' },
    { label: STRINGS.FORM_PHONE, value: phone, icon: 'phone' },
    { label: STRINGS.FORM_EMAIL, value: email, icon: 'mail' },
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
