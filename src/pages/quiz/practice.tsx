import { useMemo, useState } from 'react'
import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import type { QuizAnswer, QuizPracticeQuestionState, QuizPracticeSession } from '@/contracts/quiz'
import {
  abandonPracticeSession,
  addQuizCollection,
  createPracticeSession,
  getCurrentPracticeSession,
  getPracticeSession,
  listQuizCollections,
  removeQuizCollection,
  submitPracticeAttempt,
} from '@/services/dataService'
import {
  answerFingerprint,
  cachePracticeSessionId,
  clearAttemptKey,
  clearCachedPracticeSessionId,
  clearPracticeAttemptKeys,
  getCachedPracticeSessionId,
  getOrCreateAttemptKey,
} from '@/utils/quizRuntime'
import { ApiError } from '@/utils/request'
import { answerIncludes, isMultipleChoice, quizOptions, quizTypeLabel } from '@/utils/quizView'
import styles from './practice.module.scss'

const QUESTION_COUNTS = [10, 20, 50, 100] as const

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message && error.message !== 'UNAUTHORIZED'
    ? error.message
    : '操作失败，请稍后重试'
}

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && (error.statusCode === 404 || error.code === 40300)
}

function initialAnswers(session: QuizPracticeSession): Record<number, QuizAnswer> {
  const answers: Record<number, QuizAnswer> = {}
  for (const question of session.questions) {
    if (question.latest_result) answers[question.session_question_id] = question.latest_result.user_answer
  }
  return answers
}

export default function QuizPracticePage() {
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [requestedMode, setRequestedMode] = useState<'normal' | 'wrong'>('normal')
  const [questionCount, setQuestionCount] = useState<number>(20)
  const [session, setSession] = useState<QuizPracticeSession | null>(null)
  const [answers, setAnswers] = useState<Record<number, QuizAnswer>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [collectionIds, setCollectionIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [collectionBusy, setCollectionBusy] = useState(false)
  const [loadError, setLoadError] = useState('')

  const applySession = (next: QuizPracticeSession) => {
    setSession(next)
    if (next.status === 'in_progress') cachePracticeSessionId(next.id)
    else clearCachedPracticeSessionId(next.id)
    setAnswers(initialAnswers(next))
    const firstUnanswered = next.questions.findIndex(question => !question.answered)
    setCurrentIndex(firstUnanswered >= 0 ? firstUnanswered : 0)
  }

  const refreshCollections = () => {
    listQuizCollections({ page: 1, page_size: 100 })
      .then(page => setCollectionIds(new Set(page.items.map(item => item.question_id))))
      .catch(() => undefined)
  }

  useLoad(options => {
    const parsedCategory = Number(options?.categoryId)
    const mode = options?.mode === 'wrong' ? 'wrong' : 'normal'
    const explicitSessionId = Number(options?.sessionId)
    setRequestedMode(mode)
    if (Number.isInteger(parsedCategory) && parsedCategory > 0) setCategoryId(parsedCategory)
    refreshCollections()

    const cachedSessionId = getCachedPracticeSessionId()
    const loadSession = Number.isInteger(explicitSessionId) && explicitSessionId > 0
      ? getPracticeSession(explicitSessionId)
      : cachedSessionId
        ? getPracticeSession(cachedSessionId).catch(error => {
          if (!isNotFound(error)) throw error
          clearCachedPracticeSessionId(cachedSessionId)
          return getCurrentPracticeSession()
        })
        : getCurrentPracticeSession()
    loadSession
      .then(current => {
        if (current) applySession(current)
        else if (mode === 'wrong') return startSession('wrong', null, 20)
        return undefined
      })
      .catch(error => setLoadError(errorMessage(error)))
      .finally(() => setLoading(false))
  })

  const startSession = async (mode = requestedMode, selectedCategory = categoryId, count = questionCount) => {
    if (starting) return
    if (mode === 'normal' && !selectedCategory) {
      Taro.showToast({ title: '请从题库分类进入练习', icon: 'none' })
      return
    }
    setStarting(true)
    setLoadError('')
    try {
      const created = await createPracticeSession(mode === 'wrong'
        ? { mode: 'wrong' }
        : { mode: 'normal', category_id: selectedCategory!, question_count: count })
      applySession(created)
      if (mode === 'normal' && created.actual_count < created.requested_count) {
        Taro.showToast({ title: `可用题目不足，已使用全部 ${created.actual_count} 题`, icon: 'none', duration: 2500 })
      }
    } catch (error) {
      setLoadError(errorMessage(error))
    } finally {
      setStarting(false)
      setLoading(false)
    }
  }

  const currentQuestion = session?.questions[currentIndex]
  const selectedAnswer = currentQuestion ? answers[currentQuestion.session_question_id] : undefined
  const displayedResult = currentQuestion?.latest_result
    && selectedAnswer
    && answerFingerprint(selectedAnswer) === answerFingerprint(currentQuestion.latest_result.user_answer)
    ? currentQuestion.latest_result
    : null

  const chooseOption = (question: QuizPracticeQuestionState, label: string) => {
    if (submitting || session?.status !== 'in_progress') return
    setAnswers(previous => {
      if (!isMultipleChoice(question.question_type)) {
        return { ...previous, [question.session_question_id]: label }
      }
      const current = previous[question.session_question_id]
      const selected = Array.isArray(current) ? current : []
      const next = selected.includes(label) ? selected.filter(item => item !== label) : [...selected, label].sort()
      if (next.length === 0) {
        const copy = { ...previous }
        delete copy[question.session_question_id]
        return copy
      }
      return { ...previous, [question.session_question_id]: next }
    })
  }

  const submitCurrent = async () => {
    if (!session || !currentQuestion || !selectedAnswer || submitting) return
    const idempotencyKey = getOrCreateAttemptKey(session.id, currentQuestion.session_question_id, selectedAnswer)
    setSubmitting(true)
    try {
      const result = await submitPracticeAttempt(session.id, {
        session_question_id: currentQuestion.session_question_id,
        idempotency_key: idempotencyKey,
        user_answer: selectedAnswer,
      })
      clearAttemptKey(session.id, currentQuestion.session_question_id)
      const locallyUpdated: QuizPracticeSession = {
        ...session,
        questions: session.questions.map(question => question.session_question_id === currentQuestion.session_question_id
          ? { ...question, answered: true, attempt_count: question.attempt_count + 1, latest_result: result }
          : question),
      }
      if (locallyUpdated.questions.every(question => question.answered)) {
        const completedFallback: QuizPracticeSession = {
          ...locallyUpdated,
          status: 'completed',
          completed_at: result.submitted_at,
          lock_version: locallyUpdated.lock_version + 1,
        }
        // The successful final-attempt response proves that the server has
        // completed this session. Enter a terminal local state before the
        // detail refresh so a transient GET failure cannot expose resubmit or
        // abandon controls for an already-finished session.
        applySession(completedFallback)
        clearPracticeAttemptKeys(session.id)
        try {
          const completed = await getPracticeSession(session.id)
          applySession(completed)
        } catch {
          Taro.showToast({ title: '练习已完成，服务端详情暂未刷新', icon: 'none', duration: 3000 })
        }
      } else {
        setSession(locallyUpdated)
      }
    } catch (error) {
      Taro.showToast({ title: `${errorMessage(error)}；再次提交会安全重试`, icon: 'none', duration: 3000 })
    } finally {
      setSubmitting(false)
    }
  }

  const toggleCollection = async () => {
    if (!currentQuestion || collectionBusy) return
    const questionId = currentQuestion.id
    const active = collectionIds.has(questionId)
    setCollectionBusy(true)
    try {
      const result = active ? await removeQuizCollection(questionId) : await addQuizCollection(questionId)
      setCollectionIds(previous => {
        const next = new Set(previous)
        if (result.is_active) next.add(questionId)
        else next.delete(questionId)
        return next
      })
      Taro.showToast({ title: result.is_active ? '已收藏' : '已取消收藏', icon: 'none' })
    } catch (error) {
      Taro.showToast({ title: errorMessage(error), icon: 'none' })
    } finally {
      setCollectionBusy(false)
    }
  }

  const abandon = () => {
    if (!session || session.status !== 'in_progress') return
    Taro.showModal({
      title: '放弃本轮练习',
      content: '已提交的作答仍计入练习统计和错题本，本轮会话将标记为已放弃。',
      success: async result => {
        if (!result.confirm) return
        try {
          const action = await abandonPracticeSession(session.id)
          clearPracticeAttemptKeys(session.id)
          applySession({
            ...session,
            status: 'abandoned',
            completed_at: null,
            abandoned_at: action.abandoned_at,
            lock_version: session.lock_version + 1,
          })
          try {
            const abandoned = await getPracticeSession(session.id)
            applySession(abandoned)
          } catch {
            Taro.showToast({ title: '本轮已放弃，服务端详情暂未刷新', icon: 'none', duration: 3000 })
          }
        } catch (error) {
          Taro.showToast({ title: errorMessage(error), icon: 'none' })
        }
      },
    })
  }

  const startNextSession = () => {
    if (!session || starting) return
    const nextMode = session.mode
    const nextCategoryId = session.category_id
    const nextCount = session.requested_count
    setSession(null)
    setAnswers({})
    setCurrentIndex(0)
    void startSession(nextMode, nextCategoryId, nextCount)
  }

  const answeredCount = session?.questions.filter(question => question.answered).length ?? 0
  const correctCount = session?.questions.filter(question => question.latest_result?.is_correct).length ?? 0
  const optionItems = useMemo(() => currentQuestion ? quizOptions(currentQuestion.options) : [], [currentQuestion])

  if (loading) {
    return <AuthGuard><View className={styles.page}><PageHeader title='练习' shouldShowBack /><View className={styles.resultBody}><Text>正在恢复练习…</Text></View></View></AuthGuard>
  }

  if (!session) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={requestedMode === 'wrong' ? '错题专项' : '章节练习'} shouldShowBack />
          <View className={styles.setupBody}>
            {loadError && <Text className={styles.errorText}>{loadError}</Text>}
            {requestedMode === 'normal' && categoryId ? (
              <>
                <Text className={styles.setupTitle}>选择本轮题目数量</Text>
                <Text className={styles.setupHint}>若范围内不足 10 题，将自动使用全部可用题目。</Text>
                <View className={styles.countGrid}>
                  {QUESTION_COUNTS.map(count => (
                    <View key={count} className={`${styles.countItem} ${questionCount === count ? styles.countItemActive : ''}`} onClick={() => setQuestionCount(count)}>
                      <Text>{count} 题</Text>
                    </View>
                  ))}
                </View>
                <Button variant='gradient' size='lg' loading={starting} onClick={() => startSession()}>{starting ? '创建中…' : '开始练习'}</Button>
              </>
            ) : (
              <EmptyState title={requestedMode === 'wrong' ? '暂无可用错题，或创建失败' : '请从题库分类选择练习范围'} />
            )}
          </View>
        </View>
      </AuthGuard>
    )
  }

  if (session.status !== 'in_progress') {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={session.mode === 'wrong' ? '错题专项' : '练习结果'} shouldShowBack />
          <View className={styles.resultBody}>
            <View className={styles.resultCard}>
              <Text className={styles.resultScore}>{session.status === 'completed' ? '本轮练习已完成' : '本轮练习已放弃'}</Text>
              <Text className={styles.resultAccuracy}>已答 {answeredCount} / {session.actual_count}，当前答对 {correctCount}</Text>
              <Text className={styles.resultHint}>完整的每次作答记录可在练习历史中查看。</Text>
            </View>
            <View className={styles.resultActions}>
              <Button variant='secondary' size='lg' onClick={() => Taro.navigateTo({ url: '/pages/quiz/history' })}>查看练习历史</Button>
              <Button variant='gradient' size='lg' loading={starting} onClick={startNextSession}>
                {session.mode === 'wrong' ? '再练最近错题' : '开始新一轮'}
              </Button>
            </View>
          </View>
        </View>
      </AuthGuard>
    )
  }

  if (!currentQuestion) {
    return <AuthGuard><View className={styles.page}><PageHeader title='练习' shouldShowBack /><EmptyState title='会话中没有题目' /></View></AuthGuard>
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={session.mode === 'wrong' ? '错题专项' : '章节练习'} shouldShowBack />
        <ScrollView className={styles.body} scrollY>
          <View className={styles.sessionBar}>
            <Text>{answeredCount} / {session.actual_count} 已至少作答一次</Text>
            <Text className={styles.abandonLink} onClick={abandon}>放弃本轮</Text>
          </View>
          {session.actual_count < session.requested_count && <Text className={styles.shortageHint}>该范围题量不足，已使用全部 {session.actual_count} 题</Text>}
          <View className={styles.progressBar}><View className={styles.progressFill} style={{ width: `${((currentIndex + 1) / session.actual_count) * 100}%` }} /></View>
          <Text className={styles.progressText}>{currentIndex + 1} / {session.actual_count}</Text>

          <View className={styles.questionCard}>
            <View className={styles.questionHeader}>
              <Text className={styles.questionType}>{quizTypeLabel(currentQuestion.question_type)}</Text>
              <Text className={styles.actionBtn} onClick={toggleCollection}>
                {collectionBusy ? '处理中…' : collectionIds.has(currentQuestion.id) ? '取消收藏' : '收藏'}
              </Text>
            </View>
            <Text className={styles.pathText}>{currentQuestion.category_path.map(item => item.name).join(' / ')}</Text>
            <Text className={styles.stem}>{currentQuestion.question_text}</Text>
            <View className={styles.options}>
              {optionItems.map(option => {
                const selected = answerIncludes(selectedAnswer, option.label)
                return (
                  <View key={option.label} className={`${styles.option} ${selected ? styles.optionSelected : ''}`} onClick={() => chooseOption(currentQuestion, option.label)}>
                    <View className={`${styles.optionLabel} ${selected ? styles.optionLabelActive : ''}`}><Text>{option.label}</Text></View>
                    <Text className={styles.optionText}>{option.text}</Text>
                  </View>
                )
              })}
            </View>
            <Button className={styles.answerButton} variant='gradient' size='lg' disabled={!selectedAnswer || submitting} loading={submitting} onClick={submitCurrent}>
              {submitting ? '提交中…' : currentQuestion.answered && !displayedResult ? '再次提交答案' : '提交答案'}
            </Button>

            {displayedResult && (
              <View className={`${styles.feedback} ${displayedResult.is_correct ? styles.feedbackCorrect : styles.feedbackWrong}`}>
                <Text className={styles.feedbackText}>{displayedResult.is_correct ? '回答正确' : `回答错误，正确答案：${Array.isArray(displayedResult.correct_answer) ? displayedResult.correct_answer.join('、') : displayedResult.correct_answer}`}</Text>
                <Text className={styles.explanation}>解析：{displayedResult.explanation}</Text>
                <Text className={styles.attemptText}>本题已提交 {currentQuestion.attempt_count} 次</Text>
              </View>
            )}
          </View>

          <View className={styles.questionMap}>
            {session.questions.map((question, index) => (
              <View key={question.session_question_id} className={`${styles.questionDot} ${question.answered ? styles.questionDotAnswered : ''} ${index === currentIndex ? styles.questionDotCurrent : ''}`} onClick={() => setCurrentIndex(index)}>
                <Text>{index + 1}</Text>
              </View>
            ))}
          </View>

          <View className={styles.navRow}>
            <Button variant='secondary' onClick={() => setCurrentIndex(index => Math.max(0, index - 1))} disabled={currentIndex === 0}>上一题</Button>
            <Button variant='primary' onClick={() => setCurrentIndex(index => Math.min(session.actual_count - 1, index + 1))} disabled={currentIndex >= session.actual_count - 1}>下一题</Button>
          </View>
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
