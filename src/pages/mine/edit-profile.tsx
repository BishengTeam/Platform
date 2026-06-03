import { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { FormInput } from '@/components/FormInput'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import { getUserProfile, updateUserProfile } from '@/services/dataService'
import styles from './edit-profile.module.scss'

const MAX_EDITS = 3

export default function EditProfilePage() {
  const [nickname, setNickname] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [realName, setRealName] = useState('')
  const [idCard, setIdCard] = useState('')
  const [editCount, setEditCount] = useState(2)
  const [isReadonly, setIsReadonly] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserProfile().then(profile => {
      setNickname(profile.nickname || '')
      setPhone(profile.phone || '')
      setEmail(profile.email || '')
      setRealName(profile.real_name || '')
      setIdCard(profile.id_card || '')
    }).catch(() => {
      Taro.showToast({ title: '加载失败', icon: 'none' })
    }).finally(() => {
      setLoading(false)
    })
  }, [])

  const remaining = MAX_EDITS - editCount

  const handleSave = async () => {
    if (isReadonly) return
    if (remaining <= 0) {
      Taro.showToast({ title: STRINGS.MINE_PROFILE_EDIT_EXHAUSTED, icon: 'none' })
      setIsReadonly(true)
      return
    }
    try {
      await updateUserProfile({ nickname, phone, email, real_name: realName, id_card: idCard })
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

          <View className={styles.section}>
            <FormInput label={STRINGS.FORM_NICKNAME} placeholder='' value={nickname} onChange={setNickname} disabled={isReadonly} />
            <FormInput label={STRINGS.FORM_REAL_NAME} placeholder={STRINGS.FORM_REAL_NAME_PLACEHOLDER} value={realName} onChange={setRealName} disabled={isReadonly} />
            <FormInput label={STRINGS.FORM_ID_CARD} placeholder={STRINGS.FORM_ID_CARD_PLACEHOLDER} value={idCard} type='idcard' disabled />
            <FormInput label={STRINGS.FORM_PHONE} placeholder={STRINGS.FORM_PHONE_PLACEHOLDER} value={phone} onChange={setPhone} disabled={isReadonly} />
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