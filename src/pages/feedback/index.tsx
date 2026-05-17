import { useState, useCallback } from 'react'
import { View, Text, Textarea, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { STRINGS } from '@/constants/strings'
import styles from './index.module.scss'

export default function FeedbackPage() {
  const [content, setContent] = useState('')
  const [contact, setContact] = useState('')

  const handleContentInput = useCallback((e: { detail: { value: string } }) => {
    setContent(e.detail.value)
  }, [])

  const handleContactInput = useCallback((e: { detail: { value: string } }) => {
    setContact(e.detail.value)
  }, [])

  const handleSubmit = useCallback(() => {
    if (!content.trim()) {
      Taro.showToast({ title: STRINGS.FEEDBACK_VALID_DESC_REQUIRED, icon: 'none' })
      return
    }
    Taro.showToast({ title: STRINGS.FEEDBACK_SUCCESS, icon: 'success' })
    setContent('')
    setContact('')
  }, [content])

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.FEEDBACK_TITLE} shouldShowBack />
        <View className={styles.body}>
          <View className={styles.card}>
            <View className={styles.field}>
              <Text className={styles.label}>{STRINGS.FEEDBACK_DESC_LABEL}</Text>
              <Textarea
                className={styles.textarea}
                placeholder={STRINGS.FEEDBACK_DESC_PLACEHOLDER}
                value={content}
                onInput={handleContentInput}
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
                onInput={handleContactInput}
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
