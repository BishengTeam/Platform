import { useCallback, useState } from 'react'
import { Picker, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import type { PageData, QuizCategoryNode, QuizPracticeHistoryItem, QuizQuestionType } from '@/contracts/quiz'
import { listPracticeHistory, listQuizCategories } from '@/services/dataService'
import { shanghaiDate } from '@/utils/quizRuntime'
import { answerText, quizOptions, quizTypeLabel } from '@/utils/quizView'
import styles from './history.module.scss'

const PAGE_SIZE = 20
type CorrectFilter = 'all' | 'correct' | 'wrong'
type TypeFilter = 'all' | QuizQuestionType

function flattenCategories(nodes: QuizCategoryNode[]): QuizCategoryNode[] {
  return nodes.flatMap(node => [node, ...flattenCategories(node.children)])
}

export default function QuizPracticeHistoryPage() {
  const today = shanghaiDate()
  const [page, setPage] = useState<PageData<QuizPracticeHistoryItem> | null>(null)
  const [correctFilter, setCorrectFilter] = useState<CorrectFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [categories, setCategories] = useState<QuizCategoryNode[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback((pageNumber = 1, correct = correctFilter, type = typeFilter, selectedCategory = categoryId, from = dateFrom, to = dateTo) => {
    setLoading(true)
    setError(false)
    listPracticeHistory({
      page: pageNumber,
      page_size: PAGE_SIZE,
      is_correct: correct === 'all' ? undefined : correct === 'correct',
      question_type: type === 'all' ? undefined : type,
      category_id: selectedCategory ?? undefined,
      date_from: from || undefined,
      date_to: to || undefined,
    })
      .then(setPage)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [categoryId, correctFilter, dateFrom, dateTo, typeFilter])

  useDidShow(() => {
    listQuizCategories().then(tree => setCategories(flattenCategories(tree))).catch(() => undefined)
    load()
  })

  const chooseCategory = () => Taro.showActionSheet({
    itemList: ['全部分类', ...categories.map(category => `${'　'.repeat(category.depth - 1)}${category.name}`)],
    success: result => {
      const selected = result.tapIndex === 0 ? null : categories[result.tapIndex - 1]?.id ?? null
      setCategoryId(selected)
      load(1, correctFilter, typeFilter, selected, dateFrom, dateTo)
    },
  })

  const chooseCorrect = () => Taro.showActionSheet({
    itemList: ['全部结果', '仅正确', '仅错误'],
    success: result => {
      const value: CorrectFilter = result.tapIndex === 1 ? 'correct' : result.tapIndex === 2 ? 'wrong' : 'all'
      setCorrectFilter(value)
      load(1, value, typeFilter)
    },
  })

  const chooseType = () => Taro.showActionSheet({
    itemList: ['全部题型', '单选题', '多选题', '判断题'],
    success: result => {
      const values: TypeFilter[] = ['all', 'single_choice', 'multiple_choice', 'judge']
      const value = values[result.tapIndex] ?? 'all'
      setTypeFilter(value)
      load(1, correctFilter, value)
    },
  })

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='练习历史' shouldShowBack />
        <View className={styles.filters}>
          <Button size='sm' variant='secondary' onClick={chooseCategory}>{categoryId ? categories.find(item => item.id === categoryId)?.name ?? '所选分类' : '全部分类'}</Button>
          <Button size='sm' variant='secondary' onClick={chooseType}>{typeFilter === 'all' ? '全部题型' : quizTypeLabel(typeFilter)}</Button>
          <Button size='sm' variant='secondary' onClick={chooseCorrect}>{correctFilter === 'all' ? '全部结果' : correctFilter === 'correct' ? '仅正确' : '仅错误'}</Button>
        </View>
        <View className={styles.dateFilters}>
          <Picker mode='date' value={dateFrom || dateTo || today} end={dateTo || today} onChange={event => { const value = String(event.detail.value); setDateFrom(value); load(1, correctFilter, typeFilter, categoryId, value, dateTo) }}>
            <View className={styles.dateButton}><Text>{dateFrom || '开始日期'}</Text></View>
          </Picker>
          <Text className={styles.dateDivider}>至</Text>
          <Picker mode='date' value={dateTo || today} start={dateFrom || undefined} end={today} onChange={event => { const value = String(event.detail.value); setDateTo(value); load(1, correctFilter, typeFilter, categoryId, dateFrom, value) }}>
            <View className={styles.dateButton}><Text>{dateTo || '结束日期'}</Text></View>
          </Picker>
          {(dateFrom || dateTo) && <Text className={styles.clearDate} onClick={() => { setDateFrom(''); setDateTo(''); load(1, correctFilter, typeFilter, categoryId, '', '') }}>清除日期</Text>}
        </View>
        <ScrollView className={styles.body} scrollY>
          {loading && <Text className={styles.state}>正在加载练习历史…</Text>}
          {!loading && error && <EmptyState title='练习历史加载失败' />}
          {!loading && !error && page?.items.length === 0 && <EmptyState title='暂无符合条件的作答记录' />}
          {page?.items.map(item => (
            <View key={item.attempt_id} className={styles.card}>
              <View className={styles.header}>
                <Text className={item.is_correct ? styles.correct : styles.wrong}>{item.is_correct ? '正确' : '错误'} · 第 {item.attempt_no} 次作答</Text>
                <Text className={styles.time}>{new Date(item.submitted_at).toLocaleString()}</Text>
              </View>
              <Text className={styles.path}>{item.category_path.map(node => node.name).join(' / ')} · {quizTypeLabel(item.question_type)}</Text>
              <Text className={styles.stem}>{item.question_text}</Text>
              <View className={styles.options}>{quizOptions(item.options).map(option => <Text key={option.label}>{option.label}. {option.text}</Text>)}</View>
              <Text className={styles.answer}>本次答案：{answerText(item.user_answer)}　正确答案：{answerText(item.correct_answer)}</Text>
              <Text className={styles.explanation}>解析：{item.explanation}</Text>
              {item.current_question_status === 'disabled' && <Text className={styles.disabled}>当前题目已停用，以上为作答时快照</Text>}
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
