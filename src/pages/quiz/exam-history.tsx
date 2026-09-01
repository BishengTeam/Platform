import { useState } from 'react'
import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import type { PageData, QuizExamListItem } from '@/contracts/quiz'
import { listQuizExams } from '@/services/dataService'
import styles from './exam-history.module.scss'

const PAGE_SIZE = 20
const STATUS_LABEL: Record<QuizExamListItem['status'], string> = {
  in_progress: '进行中', completed: '已完成', timed_out: '超时结算', abandoned: '已放弃',
}
const REVIEW_LABEL: Record<QuizExamListItem['review_status'], string> = {
  none: '',
  pending: ' · 评阅中（待领取）',
  in_progress: ' · 评阅中',
  recalled: ' · 评阅已撤回',
  completed: '',
}

export default function QuizExamHistoryPage() {
  const [page, setPage] = useState<PageData<QuizExamListItem> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = (pageNumber = 1) => {
    setLoading(true)
    setError(false)
    listQuizExams({ page: pageNumber, page_size: PAGE_SIZE }).then(setPage).catch(() => setError(true)).finally(() => setLoading(false))
  }
  useDidShow(() => load())

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='考试历史' shouldShowBack />
        <ScrollView className={styles.body} scrollY>
          {loading && <Text className={styles.state}>正在加载考试历史…</Text>}
          {!loading && error && <EmptyState title='考试历史加载失败' />}
          {!loading && !error && page?.items.length === 0 && <EmptyState title='暂无考试记录' />}
          {page?.items.map(item => (
            <View key={item.id} className={styles.card} onClick={() => Taro.navigateTo({ url: `/pages/quiz/mock?examId=${item.id}` })}>
              <View className={styles.header}><Text className={styles.status}>{STATUS_LABEL[item.status]}{REVIEW_LABEL[item.review_status]}</Text><Text className={styles.score}>{item.score === null ? '-' : `${item.score.toFixed(1)} 分`}</Text></View>
              <Text className={styles.detail}>{item.question_count} 题 · 60 分钟 · {new Date(item.started_at).toLocaleString()}</Text>
              <Text className={styles.hint}>{item.status === 'in_progress' ? '点击继续作答' : item.status === 'abandoned' ? '放弃考试不展示答案和成绩' : item.review_status !== 'none' && item.review_status !== 'completed' ? '含问答题，评阅完成前不显示分数' : '点击查看答题快照、答案和解析'}</Text>
            </View>
          ))}
          {page && page.total > page.page_size && <View className={styles.pager}><Button variant='secondary' disabled={page.page <= 1 || loading} onClick={() => load(page.page - 1)}>上一页</Button><Text>{page.page} / {Math.ceil(page.total / page.page_size)}</Text><Button variant='secondary' disabled={page.page * page.page_size >= page.total || loading} onClick={() => load(page.page + 1)}>下一页</Button></View>}
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
