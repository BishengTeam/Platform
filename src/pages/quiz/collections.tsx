import { useState } from 'react'
import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import type { PageData, QuizCollectionItem } from '@/contracts/quiz'
import { listQuizCollections, removeQuizCollection } from '@/services/dataService'
import { quizOptions, quizTypeLabel } from '@/utils/quizView'
import styles from './collections.module.scss'

const PAGE_SIZE = 20

export default function QuizCollectionsPage() {
  const [page, setPage] = useState<PageData<QuizCollectionItem> | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyQuestions, setBusyQuestions] = useState<Set<number>>(new Set())

  const load = (pageNumber = 1) => {
    setLoading(true)
    listQuizCollections({ page: pageNumber, page_size: PAGE_SIZE })
      .then(setPage)
      .catch(() => Taro.showToast({ title: '收藏列表加载失败', icon: 'none' }))
      .finally(() => setLoading(false))
  }

  useDidShow(() => load())

  const remove = async (questionId: number) => {
    if (busyQuestions.has(questionId)) return
    setBusyQuestions(previous => new Set(previous).add(questionId))
    try {
      await removeQuizCollection(questionId)
      setPage(current => current
        ? { ...current, items: current.items.filter(item => item.question_id !== questionId), total: Math.max(0, current.total - 1) }
        : current)
      Taro.showToast({ title: '已取消收藏', icon: 'none' })
    } catch {
      Taro.showToast({ title: '取消收藏失败，请重试', icon: 'none' })
    } finally {
      setBusyQuestions(previous => {
        const next = new Set(previous)
        next.delete(questionId)
        return next
      })
    }
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='收藏题目' shouldShowBack />
        <View className={styles.notice}><Text>收藏题仅供浏览，不作为专项练习题池。</Text></View>
        <ScrollView className={styles.body} scrollY>
          {loading && <Text className={styles.state}>正在加载收藏…</Text>}
          {!loading && page?.items.length === 0 && <EmptyState title='暂无收藏' />}
          {page?.items.map(item => (
            <View key={item.id} className={styles.card}>
              <View className={styles.cardHeader}>
                <Text className={styles.typeTag}>{quizTypeLabel(item.question.question_type)}</Text>
                {item.question_status !== 'published' && <Text className={styles.disabled}>{item.question_status === 'deleted' ? '题目已删除' : '题目已停用'}</Text>}
              </View>
              <Text className={styles.stem}>{item.question.question_text}</Text>
              <View className={styles.options}>{quizOptions(item.question.options).map(option => <Text key={option.label}>{option.label}. {option.text}</Text>)}</View>
              <View className={styles.actions}><Button size='sm' variant='secondary' disabled={busyQuestions.has(item.question_id)} loading={busyQuestions.has(item.question_id)} onClick={() => void remove(item.question_id)}>取消收藏</Button></View>
            </View>
          ))}
          {page && page.total > page.page_size && (
            <View className={styles.pager}>
              <Button variant='secondary' disabled={page.page <= 1 || loading} onClick={() => load(page.page - 1)}>上一页</Button>
              <Text>{page.page} / {Math.ceil(page.total / page.page_size)}</Text>
              <Button variant='secondary' disabled={page.page * page.page_size >= page.total || loading} onClick={() => load(page.page + 1)}>下一页</Button>
            </View>
          )}
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
