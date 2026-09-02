import { useEffect, useState } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { joinClassroom, getMyClassrooms } from '@/services/classroomService'
import type { ClassroomMyItem } from '@/types/classroom'
import styles from './join.module.scss'

export default function ClassroomJoinPage() {
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [mine, setMine] = useState<ClassroomMyItem[]>([])

  useEffect(() => {
    getMyClassrooms().then(setMine).catch(() => setMine([]))
  }, [])

  const submit = async () => {
    const trimmed = code.trim()
    if (trimmed.length < 4) {
      Taro.showToast({ title: '请输入完整课堂码', icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      const result = await joinClassroom(trimmed)
      Taro.showToast({ title: `已加入 ${result.name}`, icon: 'success' })
      setTimeout(() => {
        getMyClassrooms().then(setMine)
        Taro.navigateTo({ url: `/pages/classroom/detail?id=${result.classroom_id}` })
      }, 800)
    } catch { /* request 层 toast */ } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='我的课堂' shouldShowBack />
        <View className={styles.body}>
          {mine.length > 0 && (
            <View className={styles.mySection}>
              <Text className={styles.sectionTitle}>已加入的课堂</Text>
              {mine.map((c) => (
                <View
                  key={c.id}
                  className={styles.myItem}
                  onClick={() => Taro.navigateTo({ url: `/pages/classroom/detail?id=${c.id}` })}
                >
                  <View className={styles.myInfo}>
                    <Text className={styles.myName}>{c.name}</Text>
                    <Text className={styles.myMeta}>
                      {c.video_count} 个视频{c.ongoing_quiz_id ? ' · 测验进行中' : ''}
                    </Text>
                  </View>
                  {c.ongoing_quiz_id && <Text className={styles.quizBadge}>测验中</Text>}
                </View>
              ))}
            </View>
          )}

          <View className={styles.card}>
            <Text className={styles.label}>输入课堂码加入新课堂</Text>
            <Input
              className={styles.input}
              type='number'
              maxlength={8}
              placeholder='6 位数字课堂码'
              value={code}
              onInput={(e) => setCode(e.detail.value)}
            />
            <Text className={styles.tip}>课堂码 30 分钟内有效；加入需已完成实名认证</Text>
            <Button variant='primary' disabled={submitting} onClick={submit} className={styles.btn}>
              {submitting ? '加入中…' : '加入课堂'}
            </Button>
          </View>
        </View>
      </View>
    </AuthGuard>
  )
}
