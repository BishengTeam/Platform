import { useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { FormInput } from '@/components/FormInput'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import styles from './profile.module.scss'

const MAX_EDITS = 3

export default function EditProfilePage() {
  const [name, setName] = useState('小王同学')
  const [phone, setPhone] = useState('13800008888')
  const [email, setEmail] = useState('xiaowang@example.com')
  const [editCount, setEditCount] = useState(2)
  const [isReadonly, setIsReadonly] = useState(false)

  const remaining = MAX_EDITS - editCount

  const handleSave = () => {
    if (isReadonly) return
    if (remaining <= 0) {
      Taro.showToast({ title: STRINGS.MINE_PROFILE_EDIT_EXHAUSTED, icon: 'none' })
      setIsReadonly(true)
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
        <PageHeader title={STRINGS.MINE_PROFILE_TITLE} shouldShowBack />
        <ScrollView className={styles.body} scrollY>
          <View className={styles.editCount}>
            <Text className={styles.editCountText}>
              {STRINGS.MINE_PROFILE_EDIT_COUNT}: {remaining}/{MAX_EDITS}
            </Text>
          </View>

          <View className={styles.section}>
            <FormInput label={STRINGS.FORM_NICKNAME} placeholder='' value={name} onChange={setName} disabled={isReadonly} />
            <FormInput label={STRINGS.FORM_PHONE} placeholder={STRINGS.FORM_PHONE_PLACEHOLDER} value={phone} onChange={setPhone} disabled={isReadonly} />
            <FormInput label={STRINGS.FORM_EMAIL} placeholder={STRINGS.FORM_EMAIL_PLACEHOLDER} value={email} onChange={setEmail} disabled={isReadonly} />
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
