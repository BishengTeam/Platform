import { useState } from 'react'
import { ScrollView, Text, View } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import type { PageData, QuizPublicQuestion } from '@/contracts/quiz'
import { listQuizQuestions } from '@/services/dataService'
import { quizOptions, quizTypeLabel } from '@/utils/quizView'
import styles from './questions.module.scss'

const PAGE_SIZE = 20

export default function QuizQuestionsPage() {
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [data, setData] = useState<PageData<QuizPublicQuestion> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = (nextCategoryId: number, page: number) => {
    setLoading(true)
    setError(false)
    listQuizQuestions({ category_id: nextCategoryId, page, page_size: PAGE_SIZE })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useLoad(options => {
    const parsed = Number(options?.categoryId)
    if (!Number.isInteger(parsed) || parsed < 1) {
      setError(true)
      setLoading(false)
      return
    }
    setCategoryId(parsed)
    load(parsed, 1)
  })

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='题目浏览' shouldShowBack />
        <ScrollView className={styles.body} scrollY>
          {loading && <Text className={styles.state}>正在加载题目…</Text>}
          {!loading && error && <EmptyState title='题目加载失败，请稍后重试' />}
          {!loading && !error && data?.items.length === 0 && <EmptyState title='该分类暂无可用题目' />}
          {data?.items.map((question, index) => (
            <View key={question.id} className={styles.card}>
              <Text className={styles.type}>{quizTypeLabel(question.question_type)}</Text>
              <Text className={styles.stem}>{(data.page - 1) * data.page_size + index + 1}. {question.question_text}</Text>
              <View className={styles.options}>
                {quizOptions(question.options).map(option => (
                  <Text key={option.label} className={styles.option}>{option.label}. {option.text}</Text>
                ))}
              </View>
              <Text className={styles.hiddenHint}>浏览模式不展示答案和解析</Text>
            </View>
          ))}
          {data && data.total > data.page_size && categoryId && (
            <View className={styles.pager}>
              <Button variant='secondary' disabled={data.page <= 1 || loading} onClick={() => load(categoryId, data.page - 1)}>上一页</Button>
              <Text>{data.page} / {Math.ceil(data.total / data.page_size)}</Text>
              <Button variant='secondary' disabled={data.page * data.page_size >= data.total || loading} onClick={() => load(categoryId, data.page + 1)}>下一页</Button>
            </View>
          )}
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
