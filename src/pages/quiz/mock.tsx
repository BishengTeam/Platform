import { useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import type { QuizAnswer, QuizCategoryNode, QuizExamDetail, QuizExamInProgress, QuizExamQuestionState } from '@/contracts/quiz'
import {
  abandonQuizExam,
  createQuizExam,
  getCurrentQuizExam,
  getQuizExam,
  listQuizCategories,
  saveQuizExamAnswer,
  submitQuizExam,
} from '@/services/dataService'
import { ApiError } from '@/utils/request'
import {
  cacheExamId,
  clearCachedExamId,
  formatCountdown,
  getCachedExamId,
  remainingSeconds,
  serverClockOffset,
} from '@/utils/quizRuntime'
import { answerIncludes, answerText, isMultipleChoice, quizOptions, quizTypeLabel } from '@/utils/quizView'
import styles from './mock.module.scss'

const QUESTION_COUNTS = [10, 20, 50, 100] as const

interface TerminalActionFallback {
  examId: number
  status: 'completed' | 'timed_out' | 'abandoned'
}

function flattenCategories(nodes: QuizCategoryNode[]): QuizCategoryNode[] {
  return nodes.flatMap(node => [node, ...flattenCategories(node.children)])
}

function messageOf(error: unknown): string {
  return error instanceof Error && error.message !== 'UNAUTHORIZED' ? error.message : '操作失败，请稍后重试'
}

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && (error.statusCode === 404 || error.code === 40300)
}

export default function QuizMockPage() {
  const [exam, setExam] = useState<QuizExamDetail | null>(null)
  const [categories, setCategories] = useState<QuizCategoryNode[]>([])
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [questionCount, setQuestionCount] = useState<number>(20)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [savingQuestionId, setSavingQuestionId] = useState<number | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [remaining, setRemaining] = useState(0)
  const [loadError, setLoadError] = useState('')
  const [terminalAction, setTerminalAction] = useState<TerminalActionFallback | null>(null)
  const clockOffsetRef = useRef(0)
  const timeoutRefreshRef = useRef(false)

  const applyExam = (next: QuizExamDetail) => {
    setExam(next)
    setTerminalAction(null)
    if (next.status === 'in_progress') cacheExamId(next.id)
    else clearCachedExamId(next.id)
    if (next.status === 'in_progress') {
      const receivedAt = Date.now()
      clockOffsetRef.current = serverClockOffset(next.server_time, receivedAt)
      setRemaining(remainingSeconds(next.deadline_at, clockOffsetRef.current, receivedAt))
      const firstUnanswered = next.questions.findIndex(question => question.user_answer === null)
      setCurrentIndex(firstUnanswered >= 0 ? firstUnanswered : 0)
      timeoutRefreshRef.current = false
    } else {
      setRemaining(0)
    }
  }

  const refreshExam = async (examId: number) => {
    const next = await getQuizExam(examId)
    applyExam(next)
    return next
  }

  useLoad(options => {
    const explicitExamId = Number(options?.examId)
    const explicitCategoryId = Number(options?.categoryId)
    const cachedExamId = getCachedExamId()
    if (Number.isInteger(explicitCategoryId) && explicitCategoryId > 0) setCategoryId(explicitCategoryId)
    const categoriesRequest = listQuizCategories().catch(error => {
      setLoadError(`分类加载失败：${messageOf(error)}`)
      return []
    })
    Promise.all([
      categoriesRequest,
      Number.isInteger(explicitExamId) && explicitExamId > 0
        ? getQuizExam(explicitExamId)
        : cachedExamId
          ? getQuizExam(cachedExamId).catch(error => {
            if (!isNotFound(error)) throw error
            clearCachedExamId(cachedExamId)
            return getCurrentQuizExam()
          })
          : getCurrentQuizExam(),
    ])
      .then(([tree, current]) => {
        const flat = flattenCategories(tree)
        setCategories(flat)
        if (!Number.isInteger(explicitCategoryId) && flat.length > 0) setCategoryId(flat[0].id)
        if (current) applyExam(current)
      })
      .catch(error => setLoadError(messageOf(error)))
      .finally(() => setLoading(false))
  })

  useEffect(() => {
    if (!exam || exam.status !== 'in_progress') return undefined
    const update = () => {
      const next = remainingSeconds(exam.deadline_at, clockOffsetRef.current)
      setRemaining(next)
      if (next === 0 && !timeoutRefreshRef.current) {
        timeoutRefreshRef.current = true
        getQuizExam(exam.id)
          .then(applyExam)
          .catch(() => { timeoutRefreshRef.current = false })
      }
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [exam?.id, exam?.status, exam?.deadline_at])

  const create = async () => {
    if (!categoryId || creating) return
    setCreating(true)
    setLoadError('')
    try {
      const created = await createQuizExam(categoryId, questionCount)
      applyExam(created)
    } catch (error) {
      setLoadError(messageOf(error))
    } finally {
      setCreating(false)
    }
  }

  const chooseCategory = () => {
    if (categories.length === 0) return
    Taro.showActionSheet({
      itemList: categories.map(category => `${'　'.repeat(category.depth - 1)}${category.name}（${category.question_count}题）`),
      success: result => {
        const selected = categories[result.tapIndex]
        if (selected) setCategoryId(selected.id)
      },
    })
  }

  const selectAnswer = async (question: QuizExamQuestionState, label: string) => {
    if (!exam || exam.status !== 'in_progress' || savingQuestionId !== null || remaining <= 0) return
    const previous = question.user_answer
    let next: QuizAnswer
    if (isMultipleChoice(question.question_type)) {
      const values = Array.isArray(previous) ? previous : []
      next = values.includes(label) ? values.filter(value => value !== label) : [...values, label].sort()
      if (next.length === 0) {
        Taro.showToast({ title: '多选题至少选择一个选项', icon: 'none' })
        return
      }
    } else {
      next = label
    }

    setExam({
      ...exam,
      questions: exam.questions.map(item => item.exam_question_id === question.exam_question_id ? { ...item, user_answer: next } : item),
    })
    setSavingQuestionId(question.exam_question_id)
    try {
      const saved = await saveQuizExamAnswer(exam.id, question.exam_question_id, {
        user_answer: next,
        lock_version: question.answer_lock_version ?? 0,
      })
      setExam(current => current?.status === 'in_progress' ? {
        ...current,
        questions: current.questions.map(item => item.exam_question_id === saved.exam_question_id
          ? { ...item, user_answer: saved.user_answer, answer_lock_version: saved.lock_version }
          : item),
      } : current)
    } catch (error) {
      if (error instanceof ApiError && (error.statusCode === 409 || error.code === 40201)) {
        try {
          await refreshExam(exam.id)
          Taro.showToast({ title: '答案版本已变化，已加载服务端最新状态', icon: 'none', duration: 2500 })
        } catch {
          setExam(current => current?.status === 'in_progress' ? {
            ...current,
            questions: current.questions.map(item => item.exam_question_id === question.exam_question_id ? { ...item, user_answer: previous } : item),
          } : current)
          Taro.showToast({ title: '答案版本冲突且刷新失败，请重新进入考试', icon: 'none', duration: 3000 })
        }
      } else {
        setExam(current => current?.status === 'in_progress' ? {
          ...current,
          questions: current.questions.map(item => item.exam_question_id === question.exam_question_id ? { ...item, user_answer: previous } : item),
        } : current)
        Taro.showToast({ title: `答案保存失败：${messageOf(error)}`, icon: 'none', duration: 2500 })
      }
    } finally {
      setSavingQuestionId(null)
    }
  }

  const submit = () => {
    if (!exam || exam.status !== 'in_progress' || actionBusy) return
    const unanswered = exam.questions.filter(question => question.user_answer === null).length
    Taro.showModal({
      title: '确认交卷',
      content: unanswered > 0 ? `还有 ${unanswered} 题未作答。交卷后不能修改，确定继续吗？` : '全部题目均已作答，交卷后不能修改。',
      success: async result => {
        if (!result.confirm) return
        setActionBusy(true)
        try {
          const action = await submitQuizExam(exam.id)
          if (action.status === 'completed' || action.status === 'timed_out') {
            clearCachedExamId(exam.id)
            setTerminalAction({ examId: exam.id, status: action.status })
          }
          try {
            await refreshExam(exam.id)
          } catch {
            Taro.showToast({ title: '交卷已成功，结果加载失败，请从考试历史重新进入', icon: 'none', duration: 3000 })
          }
        } catch (error) {
          Taro.showToast({ title: messageOf(error), icon: 'none' })
        } finally {
          setActionBusy(false)
        }
      },
    })
  }

  const abandon = () => {
    if (!exam || exam.status !== 'in_progress' || actionBusy) return
    Taro.showModal({
      title: '放弃考试',
      content: '已保存答案会永久保留，但不生成成绩、不计入考试统计，也不会展示答案解析。',
      success: async result => {
        if (!result.confirm) return
        setActionBusy(true)
        try {
          const action = await abandonQuizExam(exam.id)
          if (action.status === 'abandoned') {
            clearCachedExamId(exam.id)
            setTerminalAction({ examId: exam.id, status: 'abandoned' })
          }
          try {
            await refreshExam(exam.id)
          } catch {
            Taro.showToast({ title: '考试已放弃，详情加载失败，请从考试历史重新进入', icon: 'none', duration: 3000 })
          }
        } catch (error) {
          Taro.showToast({ title: messageOf(error), icon: 'none' })
        } finally {
          setActionBusy(false)
        }
      },
    })
  }

  const selectedCategory = categories.find(category => category.id === categoryId)
  if (loading) return <AuthGuard><View className={styles.page}><PageHeader title='模拟考试' shouldShowBack /><View className={styles.emptyBody}><Text>正在恢复考试…</Text></View></View></AuthGuard>

  if (terminalAction) {
    const isAbandoned = terminalAction.status === 'abandoned'
    const retryDetail = () => {
      if (actionBusy) return
      setActionBusy(true)
      refreshExam(terminalAction.examId)
        .catch(error => Taro.showToast({ title: `详情加载失败：${messageOf(error)}`, icon: 'none', duration: 2500 }))
        .finally(() => setActionBusy(false))
    }
    const startAnother = () => {
      setTerminalAction(null)
      setExam(null)
    }
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={isAbandoned ? '考试详情' : '考试结果'} shouldShowBack />
          <View className={styles.resultBody}>
            <View className={styles.resultCard}>
              <Text className={styles.resultScore}>{isAbandoned ? '考试已放弃' : '交卷已成功'}</Text>
              <Text className={styles.resultAccuracy}>{isAbandoned ? '本场不生成成绩，也不计入考试统计。' : '服务端已完成结算，成绩详情暂未加载。'}</Text>
              <Text className={styles.hiddenNotice}>{isAbandoned ? '按规则不展示答案和解析。' : '无需重复交卷，可重试加载或从考试历史进入。'}</Text>
            </View>
            <View className={styles.resultActions}>
              <Button variant='secondary' size='lg' loading={actionBusy} onClick={retryDetail}>重试加载详情</Button>
              <Button variant='secondary' size='lg' onClick={() => Taro.navigateTo({ url: '/pages/quiz/exam-history' })}>考试历史</Button>
              <Button variant='gradient' size='lg' onClick={startAnother}>创建新考试</Button>
            </View>
          </View>
        </View>
      </AuthGuard>
    )
  }

  if (!exam) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title='模拟考试' shouldShowBack />
          <View className={styles.setupBody}>
            <Text className={styles.setupTitle}>创建 60 分钟模拟考试</Text>
            <Text className={styles.setupHint}>同一时间只能有一场进行中考试；题目顺序由服务端随机固定。</Text>
            <View className={styles.selector} onClick={chooseCategory}><Text>{selectedCategory?.name ?? '请选择分类'}</Text><Text>›</Text></View>
            <View className={styles.countGrid}>{QUESTION_COUNTS.map(count => <View key={count} className={`${styles.countItem} ${questionCount === count ? styles.countItemActive : ''}`} onClick={() => setQuestionCount(count)}><Text>{count} 题</Text></View>)}</View>
            {loadError && <Text className={styles.errorText}>{loadError}</Text>}
            <Button variant='gradient' size='lg' loading={creating} disabled={!categoryId || creating} onClick={create}>{creating ? '创建中…' : '开始考试'}</Button>
            <Button variant='secondary' size='lg' onClick={() => Taro.navigateTo({ url: '/pages/quiz/exam-history' })}>查看考试历史</Button>
          </View>
        </View>
      </AuthGuard>
    )
  }

  if (exam.status === 'abandoned') {
    return (
      <AuthGuard><View className={styles.page}><PageHeader title='考试详情' shouldShowBack /><View className={styles.resultBody}><View className={styles.resultCard}><Text className={styles.resultScore}>考试已放弃</Text><Text className={styles.resultAccuracy}>已保存答案永久保留，但不生成成绩、不计入考试统计。</Text><Text className={styles.hiddenNotice}>按规则，放弃后不展示具体答案、正确答案或解析。</Text></View><Button variant='gradient' size='lg' onClick={() => setExam(null)}>创建新考试</Button></View></View></AuthGuard>
    )
  }

  if (exam.status === 'completed' || exam.status === 'timed_out') {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title='考试结果' shouldShowBack />
          <ScrollView className={styles.body} scrollY>
            <View className={styles.resultCard}>
              <Text className={styles.resultScore}>{exam.score.toFixed(1)} 分</Text>
              <Text className={styles.resultAccuracy}>{exam.status === 'timed_out' ? '服务端超时结算' : '正常交卷'} · 对 {exam.correct_count} / 错 {exam.wrong_count} / 未答 {exam.unanswered_count}</Text>
            </View>
            {exam.questions.map((question, index) => (
              <View key={question.exam_question_id} className={styles.resultQuestion}>
                <Text className={question.is_correct ? styles.correct : styles.wrong}>{index + 1}. {question.question_text}</Text>
                <View className={styles.resultOptions}>{quizOptions(question.options).map(option => <Text key={option.label}>{option.label}. {option.text}</Text>)}</View>
                <Text className={styles.answerLine}>你的答案：{answerText(question.user_answer)}　正确答案：{answerText(question.correct_answer)}</Text>
                <Text className={styles.explanation}>解析：{question.explanation}</Text>
              </View>
            ))}
            <View className={styles.resultActions}><Button variant='secondary' size='lg' onClick={() => Taro.navigateTo({ url: '/pages/quiz/exam-history' })}>考试历史</Button><Button variant='gradient' size='lg' onClick={() => setExam(null)}>再考一场</Button></View>
          </ScrollView>
        </View>
      </AuthGuard>
    )
  }

  const inProgress = exam as QuizExamInProgress
  const currentQuestion = inProgress.questions[currentIndex]
  const options = quizOptions(currentQuestion?.options ?? {})
  const answeredCount = inProgress.questions.filter(question => question.user_answer !== null).length
  if (!currentQuestion) return <AuthGuard><View className={styles.page}><PageHeader title='模拟考试' shouldShowBack /><EmptyState title='考试中没有题目' /></View></AuthGuard>

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='模拟考试' shouldShowBack />
        <View className={styles.topBar}>
          <View className={styles.timer}><Text className={styles.timerIcon}>⏱</Text><Text className={styles.timerText}>{formatCountdown(remaining)}</Text></View>
          <Text className={styles.progressText}>{answeredCount} / {inProgress.question_count} 已答</Text>
          <Text className={styles.abandonLink} onClick={abandon}>放弃</Text>
        </View>
        <View className={styles.progressBar}><View className={styles.progressFill} style={{ width: `${(answeredCount / inProgress.question_count) * 100}%` }} /></View>
        <ScrollView className={styles.body} scrollY>
          <View className={styles.questionCard}>
            <View className={styles.questionHeader}><Text className={styles.questionIndex}>{currentIndex + 1}. {quizTypeLabel(currentQuestion.question_type)}</Text><Text className={styles.saveState}>{savingQuestionId === currentQuestion.exam_question_id ? '保存中…' : currentQuestion.answer_lock_version ? '已保存' : '未作答'}</Text></View>
            <Text className={styles.pathText}>{currentQuestion.category_path.map(item => item.name).join(' / ')}</Text>
            <Text className={styles.stem}>{currentQuestion.question_text}</Text>
            <View className={styles.options}>{options.map(option => {
              const selected = answerIncludes(currentQuestion.user_answer, option.label)
              return <View key={option.label} className={`${styles.option} ${selected ? styles.optionSelected : ''}`} onClick={() => selectAnswer(currentQuestion, option.label)}><View className={`${styles.optionLabel} ${selected ? styles.optionLabelActive : ''}`}><Text>{option.label}</Text></View><Text className={styles.optionText}>{option.text}</Text></View>
            })}</View>
            <Text className={styles.noResultHint}>考试进行中不展示答案、正误或解析；选择变化会自动保存。</Text>
          </View>
          <View className={styles.questionMap}>{inProgress.questions.map((question, index) => <View key={question.exam_question_id} className={`${styles.questionDot} ${question.user_answer !== null ? styles.questionDotAnswered : ''} ${index === currentIndex ? styles.questionDotCurrent : ''}`} onClick={() => setCurrentIndex(index)}><Text>{index + 1}</Text></View>)}</View>
          <View className={styles.navRow}><Button variant='secondary' disabled={currentIndex === 0} onClick={() => setCurrentIndex(index => Math.max(0, index - 1))}>上一题</Button>{currentIndex < inProgress.question_count - 1 ? <Button onClick={() => setCurrentIndex(index => Math.min(inProgress.question_count - 1, index + 1))}>下一题</Button> : <Button variant='gradient' loading={actionBusy} disabled={savingQuestionId !== null || remaining <= 0} onClick={submit}>交卷</Button>}</View>
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
