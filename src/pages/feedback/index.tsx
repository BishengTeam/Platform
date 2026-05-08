import { useState } from 'react'
import { View, Text, Textarea, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { STRINGS } from '@/constants/strings'
import styles from './index.module.scss'

export default function FeedbackPage() {
  const [content, setContent] = useState('')
  const [contact, setContact] = useState('')

  const handleSubmit = () => {
    if (!content.trim()) {
      Taro.showToast({ title: '请填写问题描述', icon: 'none' })
      return
    }
    Taro.showToast({ title: STRINGS.FEEDBACK_SUCCESS, icon: 'success' })
    setContent('')
    setContact('')
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.FEEDBACK_TITLE} showBack />
        <View className={styles.body}>
          <View className={styles.card}>
            <View className={styles.field}>
              <Text className={styles.label}>{STRINGS.FEEDBACK_DESC_LABEL}</Text>
              <Textarea
                className={styles.textarea}
                placeholder={STRINGS.FEEDBACK_DESC_PLACEHOLDER}
                value={content}
                onInput={e => setContent(e.detail.value)}
                maxlength={500}
                autoHeight
              />
              <Text className={styles.counter}>{content.length}/500</Text>
            </View>

            <View className={styles.field}>
              <Text className={styles.label}>{STRINGS.FEEDBACK_CONTACT_LABEL}</Text>
              <Input
                className={styles.input}
                placeholder={STRINGS.FEEDBACK_CONTACT_PLACEHOLDER}
                value={contact}
                onInput={e => setContact(e.detail.value)}
                maxlength={50}
              />
            </View>

            <View className={styles.submitBtn} onClick={handleSubmit}>
              <Text className={styles.submitText}>{STRINGS.FEEDBACK_SUBMIT}</Text>
            </View>
          </View>
        </View>
      </View>
    </AuthGuard>
  )
}
