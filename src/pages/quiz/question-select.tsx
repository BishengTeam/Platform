import { useMemo, useState } from 'react'
import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { QuizCategoryPicker } from '@/components/QuizCategoryPicker'
import type { QuizPickerNode } from '@/components/QuizCategoryPicker'
import type { PageData, QuizLibraryCatalogDetail, QuizPublicQuestion, QuizQuestionType } from '@/contracts/quiz'
import { createManualQuizExam, getQuizLibrary, listQuizLibraryQuestions, listQuizLibraries } from '@/services/dataService'
import { quizImageUrls, quizOptions, quizTypeLabel } from '@/utils/quizView'
import styles from './question-select.module.scss'

const PAGE_SIZE = 20
const BASKET_KEY = 'quiz_manual_basket'
const MIN_COUNT = 10
const MAX_COUNT = 100

interface ScopeNode extends QuizPickerNode {
  type: 'library' | 'module' | 'knowledge_point'
  libraryId: number
}

interface BasketItem { id: number; text: string }

interface StoredBasket { items: BasketItem[] }

function isStoredBasket(value: unknown): value is StoredBasket {
  if (typeof value !== 'object' || value === null || !Array.isArray((value as StoredBasket).items)) return false
  return (value as StoredBasket).items.every(item =>
    typeof item === 'object' && item !== null
    && typeof (item as BasketItem).id === 'number'
    && typeof (item as BasketItem).text === 'string')
}

function buildTree(details: QuizLibraryCatalogDetail[]): ScopeNode[] {
  return details.map(detail => ({
    type: 'library' as const,
    id: detail.id,
    name: detail.name,
    question_count: detail.question_count,
    libraryId: detail.id,
    children: detail.modules.map(module => ({
      type: 'module' as const,
      id: module.id,
      name: module.name,
      question_count: module.question_count,
      libraryId: detail.id,
      children: module.knowledge_points.map(point => ({
        type: 'knowledge_point' as const,
        id: point.id,
        name: point.name,
        question_count: point.question_count,
        libraryId: detail.id,
        children: [],
      })),
    })),
  }))
}

function findNode(nodes: ScopeNode[], type: string, id: number): ScopeNode | null {
  for (const node of nodes) {
    if (node.type === type && node.id === id) return node
    const child = findNode(node.children as ScopeNode[], type, id)
    if (child) return child
  }
  return null
}

export default function QuizQuestionSelectPage() {
  const [tree, setTree] = useState<ScopeNode[]>([])
  const [scope, setScope] = useState<ScopeNode | null>(null)
  const [pickerVisible, setPickerVisible] = useState(false)
  const [questionType, setQuestionType] = useState<'all' | QuizQuestionType>('all')
  const [page, setPage] = useState<PageData<QuizPublicQuestion> | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [basket, setBasket] = useState<BasketItem[]>([])
  const [basketVisible, setBasketVisible] = useState(false)

  const loadQuestions = (nextScope: ScopeNode, nextType: 'all' | QuizQuestionType) => {
    setLoading(true)
    setError('')
    listQuizLibraryQuestions(nextScope.libraryId, {
      scope_type: nextScope.type,
      ...(nextScope.type === 'library' ? {} : { scope_id: nextScope.id }),
      ...(nextType === 'all' ? {} : { question_type: nextType }),
      page: 1,
      page_size: PAGE_SIZE,
    })
      .then(setPage)
      .catch(() => setError('题目加载失败，请稍后重试'))
      .finally(() => setLoading(false))
  }

  const changePage = (nextPage: number) => {
    if (!scope) return
    setLoading(true)
    setError('')
    listQuizLibraryQuestions(scope.libraryId, {
      scope_type: scope.type,
      ...(scope.type === 'library' ? {} : { scope_id: scope.id }),
      ...(questionType === 'all' ? {} : { question_type: questionType }),
      page: nextPage,
      page_size: PAGE_SIZE,
    })
      .then(setPage)
      .catch(() => setError('题目加载失败，请稍后重试'))
      .finally(() => setLoading(false))
  }

  useLoad(options => {
    const stored = Taro.getStorageSync(BASKET_KEY)
    if (isStoredBasket(stored)) setBasket(stored.items)
    listQuizLibraries()
      .then(items => Promise.all(items.map(item => getQuizLibrary(item.id))))
      .then(details => {
        const nextTree = buildTree(details)
        setTree(nextTree)
        const scopeType = options?.scopeType
        const scopeId = Number(options?.scopeId)
        const explicit = scopeType && Number.isInteger(scopeId) && scopeId > 0
          ? findNode(nextTree, scopeType, scopeId)
          : null
        const initial = explicit ?? nextTree[0] ?? null
        setScope(initial)
        if (initial) loadQuestions(initial, 'all')
        else setLoading(false)
      })
      .catch(() => {
        setError('题库目录加载失败')
        setLoading(false)
      })
  })

  const selectedIds = useMemo(() => new Set(basket.map(item => item.id)), [basket])

  const persistBasket = (items: BasketItem[]) => {
    setBasket(items)
    Taro.setStorageSync(BASKET_KEY, { items } satisfies StoredBasket)
  }

  const toggleQuestion = (question: QuizPublicQuestion) => {
    if (selectedIds.has(question.id)) {
      persistBasket(basket.filter(item => item.id !== question.id))
      return
    }
    if (basket.length >= MAX_COUNT) {
      Taro.showToast({ title: `最多选择 ${MAX_COUNT} 题`, icon: 'none' })
      return
    }
    persistBasket([...basket, { id: question.id, text: question.question_text }])
  }

  const currentPageAllSelected = page !== null && page.items.length > 0
    && page.items.every(question => selectedIds.has(question.id))

  const toggleSelectAllOnPage = () => {
    if (!page || page.items.length === 0) return
    if (currentPageAllSelected) {
      const pageIds = new Set(page.items.map(question => question.id))
      persistBasket(basket.filter(item => !pageIds.has(item.id)))
    } else {
      const newItems = page.items
        .filter(question => !selectedIds.has(question.id))
        .map(question => ({ id: question.id, text: question.question_text }))
      const combined = [...basket, ...newItems]
      if (combined.length > MAX_COUNT) {
        Taro.showToast({ title: `最多选择 ${MAX_COUNT} 题`, icon: 'none' })
        return
      }
      persistBasket(combined)
    }
  }

  const selectScope = (node: ScopeNode) => {
    setScope(node)
    setPickerVisible(false)
    loadQuestions(node, questionType)
  }

  const selectType = (nextType: 'all' | QuizQuestionType) => {
    setQuestionType(nextType)
    if (scope) loadQuestions(scope, nextType)
  }

  const createExam = () => {
    if (basket.length < MIN_COUNT) {
      Taro.showToast({ title: `至少选择 ${MIN_COUNT} 题`, icon: 'none' })
      return
    }
    Taro.showModal({
      title: '手动组卷',
      content: `将用已选 ${basket.length} 题创建 60 分钟模拟考试，题目顺序按选择顺序固定。同一时间只能有一场进行中考试。`,
      confirmText: '开始考试',
      cancelText: '再选选',
      success: async result => {
        if (!result.confirm) return
        setCreating(true)
        try {
          const exam = await createManualQuizExam({ question_ids: basket.map(item => item.id) })
          Taro.removeStorageSync(BASKET_KEY)
          await Taro.redirectTo({ url: `/pages/quiz/mock?examId=${exam.id}` })
        } catch (err) {
          Taro.showToast({ title: err instanceof Error && err.message !== 'UNAUTHORIZED' && !/fail|timeout/i.test(err.message) ? err.message : '组卷失败，请重试', icon: 'none', duration: 2500 })
        } finally {
          setCreating(false)
        }
      },
    })
  }

  const typeFilters: Array<{ value: 'all' | QuizQuestionType; label: string }> = [
    { value: 'all', label: '全部' },
    { value: 'single_choice', label: '单选' },
    { value: 'multiple_choice', label: '多选' },
    { value: 'judge', label: '判断' },
  ]

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='选题组卷' shouldShowBack />
        <View className={styles.selector} onClick={() => tree.length > 0 && setPickerVisible(true)}>
          <Text className={styles.selectorText}>{scope ? `${scope.name}（${scope.question_count} 题）` : '请选择题库范围'}</Text>
          <Text className={styles.selectorArrow}>切换 ›</Text>
        </View>
        <View className={styles.filters}>
          {typeFilters.map(filter => (
            <View
              key={filter.value}
              className={`${styles.filterChip} ${questionType === filter.value ? styles.filterChipActive : ''}`}
              onClick={() => selectType(filter.value)}
            >
              <Text>{filter.label}</Text>
            </View>
          ))}
        </View>
        {page && page.items.length > 0 && (
          <View className={styles.selectAllRow} onClick={toggleSelectAllOnPage}>
            <View className={`${styles.checkbox} ${currentPageAllSelected ? styles.checkboxActive : ''}`}>
              <Text className={styles.checkboxText}>{currentPageAllSelected ? '✓' : ''}</Text>
            </View>
            <Text className={styles.selectAllText}>
              {currentPageAllSelected ? '取消本页全选' : `全选本页（${page.items.length} 题）`}
            </Text>
            <Text className={styles.selectAllMeta}>已选 {basket.length} 题</Text>
          </View>
        )}
        <ScrollView className={styles.body} scrollY>
          {loading && <Text className={styles.state}>正在加载题目…</Text>}
          {!loading && error && <EmptyState title={error} />}
          {!loading && !error && page?.items.length === 0 && <EmptyState title='该范围暂无可用题目' />}
          {page?.items.map(question => {
            const selected = selectedIds.has(question.id)
            return (
              <View key={question.id} className={`${styles.card} ${selected ? styles.cardSelected : ''}`} onClick={() => toggleQuestion(question)}>
                <View className={styles.cardHeader}>
                  <Text className={styles.typeTag}>{quizTypeLabel(question.question_type)}</Text>
                  <View className={`${styles.checkbox} ${selected ? styles.checkboxActive : ''}`}>
                    <Text className={styles.checkboxText}>{selected ? '✓' : ''}</Text>
                  </View>
                </View>
                <Text className={styles.stem}>{question.question_text}</Text>
                {quizImageUrls(question.image_urls).length > 0 && (
                  <View className={styles.questionImages}>
                    {quizImageUrls(question.image_urls).map(url => <Image key={url} className={styles.questionImage} src={url} mode='widthFix' />)}
                  </View>
                )}
                <View className={styles.options}>
                  {quizOptions(question.options).map(option => (
                    <View key={option.label} className={styles.optionBlock}>
                      <Text className={styles.optionText}>{option.label}. {option.text}</Text>
                      {question.option_image_urls?.[option.label] && (
                        <Image className={styles.optionImage} src={question.option_image_urls[option.label]} mode='widthFix' />
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )
          })}
          {page && page.total > page.page_size && (
            <View className={styles.pager}>
              <Button variant='secondary' disabled={page.page <= 1 || loading} onClick={() => changePage(page.page - 1)}>上一页</Button>
              <Text>{page.page} / {Math.ceil(page.total / page.page_size)}</Text>
              <Button variant='secondary' disabled={page.page * page.page_size >= page.total || loading} onClick={() => changePage(page.page + 1)}>下一页</Button>
            </View>
          )}
        </ScrollView>
        <View className={styles.bottomBar}>
          <View className={styles.basketInfo} onClick={() => setBasketVisible(true)}>
            <Text className={styles.basketCount}>{basket.length}</Text>
            <Text className={styles.basketLabel}>已选题（{MIN_COUNT}-{MAX_COUNT}）</Text>
          </View>
          <View className={styles.basketActions}>
            {basket.length > 0 && <Text className={styles.clearLink} onClick={() => persistBasket([])}>清空</Text>}
            <Button size='sm' variant='gradient' loading={creating} disabled={creating} onClick={createExam}>去组卷</Button>
          </View>
        </View>
        {basketVisible && (
          <View className={styles.basketOverlay} onClick={() => setBasketVisible(false)}>
            <View className={styles.basketPanel} onClick={e => e.stopPropagation()}>
              <View className={styles.basketHeader}>
                <Text className={styles.basketTitle}>试卷篮 · {basket.length} 题</Text>
                <Text className={styles.basketClose} onClick={() => setBasketVisible(false)}>✕</Text>
              </View>
              <ScrollView className={styles.basketList} scrollY>
                {basket.map((item, index) => (
                  <View key={item.id} className={styles.basketItem}>
                    <Text className={styles.basketItemText}>{index + 1}. {item.text}</Text>
                    <Text className={styles.basketRemove} onClick={() => persistBasket(basket.filter(entry => entry.id !== item.id))}>移除</Text>
                  </View>
                ))}
                {basket.length === 0 && <Text className={styles.basketEmpty}>还没有选题</Text>}
              </ScrollView>
            </View>
          </View>
        )}
        <QuizCategoryPicker
          visible={pickerVisible}
          tree={tree}
          selectedId={scope?.id ?? null}
          selectedType={scope?.type ?? null}
          onSelect={selectScope}
          onClose={() => setPickerVisible(false)}
          title='选择浏览范围'
        />
      </View>
    </AuthGuard>
  )
}
