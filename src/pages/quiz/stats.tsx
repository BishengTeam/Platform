import { useState } from 'react'
import { Text, View } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import type { QuizStats } from '@/contracts/quiz'
import { getQuizStats } from '@/services/dataService'
import styles from './stats.module.scss'

interface Metric { label: string; value: string }

function Metrics({ items }: { items: Metric[] }) {
  return <View className={styles.grid}>{items.map(item => <View key={item.label} className={styles.metric}><Text className={styles.value}>{item.value}</Text><Text className={styles.label}>{item.label}</Text></View>)}</View>
}

export default function QuizStatsPage() {
  const [stats, setStats] = useState<QuizStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useDidShow(() => {
    setLoading(true)
    setError(false)
    getQuizStats().then(setStats).catch(() => setError(true)).finally(() => setLoading(false))
  })

  const practice: Metric[] = stats ? [
    { label: '全部作答', value: String(stats.practice.total_attempts) },
    { label: '首答次数', value: String(stats.practice.first_attempts) },
    { label: '首答正确', value: String(stats.practice.first_correct_attempts) },
    { label: '首答正确率', value: `${stats.practice.accuracy}%` },
    { label: '已答题目', value: String(stats.practice.answered_questions) },
    { label: '当前错题', value: String(stats.practice.active_wrong_count) },
    { label: '收藏题目', value: String(stats.practice.active_collection_count) },
    { label: '累计打卡', value: String(stats.practice.checkin_days) },
    { label: '连续天数', value: String(stats.practice.consecutive_days) },
    { label: '今日练习', value: String(stats.practice.today_questions) },
  ] : []
  const exam: Metric[] = stats ? [
    { label: '正常完成', value: String(stats.exam.completed_exam_count) },
    { label: '超时结算', value: String(stats.exam.timed_out_exam_count) },
    { label: '考试题数', value: String(stats.exam.total_questions) },
    { label: '答对', value: String(stats.exam.correct_count) },
    { label: '答错', value: String(stats.exam.wrong_count) },
    { label: '未答', value: String(stats.exam.unanswered_count) },
    { label: '平均分', value: stats.exam.average_score === null ? '-' : stats.exam.average_score.toFixed(1) },
    { label: '最高分', value: stats.exam.highest_score === null ? '-' : stats.exam.highest_score.toFixed(1) },
    { label: '最近得分', value: stats.exam.latest_score === null ? '-' : stats.exam.latest_score.toFixed(1) },
  ] : []

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='个人题库统计' shouldShowBack />
        <View className={styles.body}>
          {loading && <Text className={styles.state}>正在加载统计…</Text>}
          {!loading && error && <EmptyState title='统计加载失败' />}
          {stats && <><View className={styles.section}><Text className={styles.title}>普通练习</Text><Metrics items={practice} /></View><View className={styles.section}><Text className={styles.title}>模拟考试</Text><Metrics items={exam} /></View></>}
        </View>
      </View>
    </AuthGuard>
  )
}
