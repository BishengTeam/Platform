import { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { STRINGS } from '@/constants/strings'
import { getRegisteredExams } from '@/services/dataService'
import styles from './exam-query.module.scss'

export default function ExamQueryPage() {
  const [exams, setExams] = useState<Array<{ id: string; name: string; examCode: string; date: string; status: string; link: string }>>([])

  useEffect(() => {
    getRegisteredExams().then(setExams).catch(() => setExams([]))
  }, [])

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.MINE_EXAM_QUERY_TITLE} shouldShowBack />
        <View className={styles.body}>
          {exams.length === 0 ? (
            <EmptyState title={STRINGS.MINE_EXAM_QUERY_EMPTY} />
          ) : (
            <View className={styles.list}>
              {exams.map(exam => (
                <View key={exam.id} className={styles.card}>
                  <View className={styles.cardInfo}>
                    <Text className={styles.examName}>{exam.name}</Text>
                    <View className={styles.examMeta}>
                      <Text className={styles.metaText}>{exam.examCode}</Text>
                      <Text className={styles.metaText}>{exam.date}</Text>
                    </View>
                    <Text className={`${styles.examStatus} ${exam.status === STRINGS.ORDERS_STATUS_ENROLLED ? styles.statusActive : ''}`}>
                      {exam.status}
                    </Text>
                  </View>
                  <Button
                    size='sm'
                    variant='secondary'
                    onClick={() => {
                      if (exam.link) {
                        Taro.setClipboardData({ data: exam.link })
                        Taro.showToast({ title: STRINGS.MINE_EXAM_LINK_COPIED, icon: 'success' })
                      }
                    }}
                  >
                    {STRINGS.MINE_EXAM_QUERY_LINK}
                  </Button>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </AuthGuard>
  )
}