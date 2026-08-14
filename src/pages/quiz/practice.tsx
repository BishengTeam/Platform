import { useMemo, useState } from 'react'
import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { Popup } from '@nutui/nutui-react-taro'
import { AuthGuard } from '@/components/AuthGuard'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { Icon } from '@/components/Icon'
import { PageHeader } from '@/components/PageHeader'
import type {
  QuizAnswer,
  QuizPracticeMode,
  QuizPracticeQuestionState,
  QuizPracticeScopePreview,
  QuizPracticeScopeType,
  QuizPracticeSession,
} from '@/contracts/quiz'
import {
  abandonPracticeSession,
  addQuizCollection,
  createPracticeSession,
  getCurrentPracticeSession,
  getPracticeSession,
  listQuizCollections,
  previewPracticeScope,
  removeQuizCollection,
  skipPracticeQuestion,
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

const LEGACY_QUESTION_COUNTS = [10, 20, 50, 100] as const

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message && error.message !== 'UNAUTHORIZED'
    ? error.message
    : '操作失败，请稍后重试'
}

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && (error.statusCode === 404 || error.code === 40300)
}

function isScopeType(value: string | undefined): value is QuizPracticeScopeType {
  return value === 'library' || value === 'module' || value === 'knowledge_point'
}

function initialAnswers(session: QuizPracticeSession): Record<number, QuizAnswer> {
  const answers: Record<number, QuizAnswer> = {}
  for (const question of session.questions) {
    if (question.latest_result) answers[question.session_question_id] = question.latest_result.user_answer
  }
  return answers
}

function sessionTitle(session: QuizPracticeSession | null, requestedMode: QuizPracticeMode): string {
  const mode = session?.mode ?? requestedMode
  if (mode === 'wrong' || mode === 'wrong_only') return '错题专项'
  return mode === 'full' ? '全量练习' : '章节练习'
}

function terminalLabel(status: QuizPracticeSession['status']): string {
  if (status === 'completed') return '本轮练习已完成'
  if (status === 'expired') return '本轮练习已过期'
  if (status === 'terminated') return '题库已归档，本轮练习已终止'
  return '本轮练习已放弃'
}

export default function QuizPracticePage() {
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [scopeType, setScopeType] = useState<QuizPracticeScopeType | null>(null)
  const [scopeId, setScopeId] = useState<number | null>(null)
  const [requestedMode, setRequestedMode] = useState<QuizPracticeMode>('normal')
  const [questionCount, setQuestionCount] = useState<number>(20)
  const [preview, setPreview] = useState<QuizPracticeScopePreview | null>(null)
  const [session, setSession] = useState<QuizPracticeSession | null>(null)
  const [answers, setAnswers] = useState<Record<number, QuizAnswer>>({})
  const [currentSessionQuestionId, setCurrentSessionQuestionId] = useState<number | null>(null)
  const [collectionIds, setCollectionIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [skipping, setSkipping] = useState(false)
  const [collectionBusy, setCollectionBusy] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [drawerVisible, setDrawerVisible] = useState(false)

  const applySession = (next: QuizPracticeSession, preferredQuestionId?: number) => {
    setSession(next)
    if (next.status === 'in_progress' || next.status === 'paused') cachePracticeSessionId(next.id)
    else clearCachedPracticeSessionId(next.id)
    setAnswers(initialAnswers(next))
    const preferred = preferredQuestionId
      ? next.questions.find(question => question.session_question_id === preferredQuestionId)
      : undefined
    const focused = preferred
      ?? next.questions.find(question => question.position === next.current_position)
      ?? next.questions.find(question => !question.answered)
      ?? next.questions[0]
    setCurrentSessionQuestionId(focused?.session_question_id ?? null)
  }

  const refreshCollections = () => {
    listQuizCollections({ page: 1, page_size: 100 })
      .then(page => setCollectionIds(new Set(page.items.map(item => item.question_id))))
      .catch(() => undefined)
  }

  const createV2Session = async (
    scope: QuizPracticeScopeType,
    id: number,
    mode: 'full' | 'wrong_only',
    options: { restart?: boolean; confirmLarge?: boolean } = {},
  ) => {
    const created = await createPracticeSession({
      mode,
      scope_type: scope,
      scope_id: id,
      restart_existing: options.restart ?? false,
      confirm_large_scope: options.confirmLarge ?? false,
    })
    applySession(created)
  }

  const prepareV2Session = async (
    scope: QuizPracticeScopeType,
    id: number,
    mode: 'full' | 'wrong_only' = 'full',
  ) => {
    setStarting(true)
    setLoadError('')
    try {
      const nextPreview = await previewPracticeScope({ scope_type: scope, scope_id: id, mode })
      setPreview(nextPreview)
      if (nextPreview.question_count === 0) {
        setLoadError(mode === 'wrong_only' ? '该范围暂无可练错题' : '该范围暂无可用题目')
        return
      }
      if (nextPreview.unfinished_session_id) {
        const choice = await Taro.showModal({
          title: '发现未完成的练习',
          content: `该范围还有一轮 ${nextPreview.question_count} 题的练习未完成。继续会保留原题目和进度；重新开始会放弃旧会话并按当前题库生成新快照。`,
          confirmText: '继续练习',
          cancelText: '重新开始',
        })
        if (choice.confirm) {
          applySession(await getPracticeSession(nextPreview.unfinished_session_id))
          return
        }
        await createV2Session(scope, id, mode, {
          restart: true,
          confirmLarge: nextPreview.requires_large_scope_confirmation,
        })
        return
      }
      if (nextPreview.requires_large_scope_confirmation) {
        const choice = await Taro.showModal({
          title: `练习全部 ${nextPreview.question_count} 题？`,
          content: `预计需要约 ${nextPreview.estimated_minutes} 分钟。会话从最后一次成功作答起 7 天有效，题库或权益暂停期间不计时。`,
          confirmText: '开始练习',
          cancelText: '暂不开始',
        })
        if (!choice.confirm) {
          setLoadError('已取消开始，可返回目录重新选择范围')
          return
        }
      }
      await createV2Session(scope, id, mode, {
        confirmLarge: nextPreview.requires_large_scope_confirmation,
      })
    } catch (error) {
      setLoadError(errorMessage(error))
    } finally {
      setStarting(false)
      setLoading(false)
    }
  }

  const startLegacySession = async (
    mode: 'normal' | 'wrong' = requestedMode === 'wrong' ? 'wrong' : 'normal',
    selectedCategory = categoryId,
    count = questionCount,
  ) => {
    if (starting) return
    if (mode === 'normal' && !selectedCategory) {
      Taro.showToast({ title: '请从题库目录进入练习', icon: 'none' })
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

  useLoad(options => {
    const parsedCategory = Number(options?.categoryId)
    const parsedScopeId = Number(options?.scopeId)
    const nextScopeType = isScopeType(options?.scopeType) ? options.scopeType : null
    const mode: QuizPracticeMode = options?.mode === 'wrong' ? 'wrong' : options?.mode === 'wrong_only' ? 'wrong_only' : nextScopeType ? 'full' : 'normal'
    const explicitSessionId = Number(options?.sessionId)
    setRequestedMode(mode)
    if (Number.isInteger(parsedCategory) && parsedCategory > 0) setCategoryId(parsedCategory)
    if (nextScopeType && Number.isInteger(parsedScopeId) && parsedScopeId > 0) {
      setScopeType(nextScopeType)
      setScopeId(parsedScopeId)
    }
    refreshCollections()

    if (Number.isInteger(explicitSessionId) && explicitSessionId > 0) {
      getPracticeSession(explicitSessionId)
        .then(applySession)
        .catch(error => setLoadError(errorMessage(error)))
        .finally(() => setLoading(false))
      return
    }
    if (nextScopeType && Number.isInteger(parsedScopeId) && parsedScopeId > 0) {
      void prepareV2Session(nextScopeType, parsedScopeId, mode === 'wrong_only' ? 'wrong_only' : 'full')
      return
    }

    const cachedSessionId = getCachedPracticeSessionId()
    const loadSession = cachedSessionId
      ? getPracticeSession(cachedSessionId).catch(error => {
        if (!isNotFound(error)) throw error
        clearCachedPracticeSessionId(cachedSessionId)
        return getCurrentPracticeSession()
      })
      : getCurrentPracticeSession()
    loadSession
      .then(current => {
        if (current) applySession(current)
        else if (mode === 'wrong') return startLegacySession('wrong', null, 20)
        return undefined
      })
      .catch(error => setLoadError(errorMessage(error)))
      .finally(() => setLoading(false))
  })

  const currentQuestion = session?.questions.find(question => question.session_question_id === currentSessionQuestionId)
    ?? session?.questions.find(question => question.position === session.current_position)
    ?? session?.questions[0]
  const selectedAnswer = currentQuestion ? answers[currentQuestion.session_question_id] : undefined
  const displayedResult = currentQuestion?.latest_result
    && selectedAnswer
    && answerFingerprint(selectedAnswer) === answerFingerprint(currentQuestion.latest_result.user_answer)
    ? currentQuestion.latest_result
    : null

  const chooseOption = (question: QuizPracticeQuestionState, label: string) => {
    if (submitting || question.answered || session?.status !== 'in_progress') return
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
    if (!session || !currentQuestion || !selectedAnswer || submitting || currentQuestion.answered) return
    const idempotencyKey = getOrCreateAttemptKey(session.id, currentQuestion.session_question_id, selectedAnswer)
    setSubmitting(true)
    try {
      const result = await submitPracticeAttempt(session.id, {
        session_question_id: currentQuestion.session_question_id,
        idempotency_key: idempotencyKey,
        user_answer: selectedAnswer,
      })
      clearAttemptKey(session.id, currentQuestion.session_question_id)
      const answeredCount = session.answered_count + 1
      const locallyUpdated: QuizPracticeSession = {
        ...session,
        answered_count: answeredCount,
        remaining_count: Math.max(0, session.actual_count - answeredCount),
        questions: session.questions.map(question => question.session_question_id === currentQuestion.session_question_id
          ? { ...question, answered: true, attempt_count: question.attempt_count + 1, latest_result: result }
          : question),
      }
      if (answeredCount >= session.actual_count) {
        const completedFallback: QuizPracticeSession = {
          ...locallyUpdated,
          status: 'completed',
          completed_at: result.submitted_at,
          current_position: null,
          lock_version: locallyUpdated.lock_version + 1,
        }
        applySession(completedFallback, currentQuestion.session_question_id)
        clearPracticeAttemptKeys(session.id)
        try { applySession(await getPracticeSession(session.id), currentQuestion.session_question_id) }
        catch { Taro.showToast({ title: '练习已完成，服务端详情暂未刷新', icon: 'none', duration: 3000 }) }
      } else {
        setSession(locallyUpdated)
      }
    } catch (error) {
      Taro.showToast({ title: `${errorMessage(error)}；再次提交会安全重试`, icon: 'none', duration: 3000 })
    } finally {
      setSubmitting(false)
    }
  }

  const advance = async () => {
    if (!session || starting) return
    setStarting(true)
    try { applySession(await getPracticeSession(session.id)) }
    catch (error) { Taro.showToast({ title: errorMessage(error), icon: 'none' }) }
    finally { setStarting(false) }
  }

  const skipCurrent = async () => {
    if (!session || !currentQuestion || skipping || currentQuestion.answered || !session.scope_type) return
    setSkipping(true)
    try {
      await skipPracticeQuestion(session.id, currentQuestion.session_question_id)
      applySession(await getPracticeSession(session.id))
    } catch (error) {
      Taro.showToast({ title: errorMessage(error), icon: 'none' })
    } finally {
      setSkipping(false)
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
    if (!session || !['in_progress', 'paused'].includes(session.status)) return
    setDrawerVisible(false)
    Taro.showModal({
      title: '放弃本轮练习',
      content: '已提交的作答仍计入练习统计和错题本，本轮会话将标记为已放弃。',
      success: async result => {
        if (!result.confirm) return
        try {
          const action = await abandonPracticeSession(session.id)
          clearPracticeAttemptKeys(session.id)
          applySession({ ...session, status: 'abandoned', completed_at: null, abandoned_at: action.abandoned_at, lock_version: session.lock_version + 1 })
        } catch (error) {
          Taro.showToast({ title: errorMessage(error), icon: 'none' })
        }
      },
    })
  }

  const startNextSession = () => {
    if (!session || starting) return
    setSession(null)
    setAnswers({})
    setCurrentSessionQuestionId(null)
    if (session.scope_type && session.scope_id && (session.mode === 'full' || session.mode === 'wrong_only')) {
      void prepareV2Session(session.scope_type, session.scope_id, session.mode)
    } else {
      void startLegacySession(session.mode === 'wrong' ? 'wrong' : 'normal', session.category_id, session.requested_count)
    }
  }

  const answeredCount = session?.scope_type ? session.answered_count : session?.questions.filter(question => question.answered).length ?? 0
  const correctCount = session?.questions.filter(question => question.latest_result?.is_correct).length ?? 0
  const wrongCount = session?.questions.filter(question => question.answered && question.latest_result && !question.latest_result.is_correct).length ?? 0
  const optionItems = useMemo(() => currentQuestion ? quizOptions(currentQuestion.options) : [], [currentQuestion])

  if (loading) {
    return <AuthGuard><View className={styles.page}><PageHeader title='练习' shouldShowBack /><View className={styles.resultBody}><Text>正在检查练习范围…</Text></View></View></AuthGuard>
  }

  if (!session) {
    const isV2 = scopeType !== null && scopeId !== null
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={sessionTitle(null, requestedMode)} shouldShowBack />
          <View className={styles.setupBody}>
            {loadError && <Text className={styles.errorText}>{loadError}</Text>}
            {isV2 ? (
              <>
                {preview && <Text className={styles.setupHint}>该范围共 {preview.question_count} 题，预计约 {preview.estimated_minutes} 分钟，练习有效期 7 天。</Text>}
                <Button variant='gradient' size='lg' loading={starting} onClick={() => void prepareV2Session(scopeType, scopeId, requestedMode === 'wrong_only' ? 'wrong_only' : 'full')}>{starting ? '创建中…' : '重新检查并开始'}</Button>
              </>
            ) : requestedMode === 'normal' && categoryId ? (
              <>
                <Text className={styles.setupTitle}>旧版限量练习</Text>
                <Text className={styles.setupHint}>这是兼容期旧分类入口；新题库目录已改为范围内全部题。</Text>
                <View className={styles.countGrid}>
                  {LEGACY_QUESTION_COUNTS.map(count => (
                    <View key={count} className={`${styles.countItem} ${questionCount === count ? styles.countItemActive : ''}`} onClick={() => setQuestionCount(count)}><Text>{count} 题</Text></View>
                  ))}
                </View>
                <Button variant='gradient' size='lg' loading={starting} onClick={() => void startLegacySession()}>{starting ? '创建中…' : '开始旧版练习'}</Button>
              </>
            ) : (
              <EmptyState title={requestedMode === 'wrong' ? '暂无可用错题，或创建失败' : '请从题库目录选择练习范围'} />
            )}
          </View>
        </View>
      </AuthGuard>
    )
  }

  if (session.status === 'paused') {
    return (
      <AuthGuard><View className={styles.page}><PageHeader title={sessionTitle(session, requestedMode)} shouldShowBack /><View className={styles.resultBody}>
        <View className={styles.resultCard}><Text className={styles.resultScore}>本轮练习已暂停</Text><Text className={styles.resultHint}>{session.pause_reason === 'quiz_entitlement_inactive' ? '课程题库权益当前不可用' : '题库当前暂停开放'}；暂停期间不消耗 7 天有效期，恢复后会自动顺延。</Text></View>
        <View className={styles.resultActions}><Button variant='secondary' size='lg' onClick={() => void advance()}>检查是否恢复</Button><Button variant='secondary' size='lg' onClick={abandon}>放弃本轮</Button></View>
      </View></View></AuthGuard>
    )
  }

  if (session.status !== 'in_progress') {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={sessionTitle(session, requestedMode)} shouldShowBack />
          <View className={styles.resultBody}>
            <View className={styles.resultCard}>
              <Text className={styles.resultScore}>{terminalLabel(session.status)}</Text>
              <Text className={styles.resultAccuracy}>已答 {answeredCount} / {session.actual_count}，当前答对 {correctCount}</Text>
              <Text className={styles.resultHint}>完整的每次作答记录可在练习历史中查看。</Text>
            </View>
            <View className={styles.resultActions}>
              <Button variant='secondary' size='lg' onClick={() => Taro.navigateTo({ url: '/pages/quiz/history' })}>查看练习历史</Button>
              {session.status !== 'terminated' && <Button variant='gradient' size='lg' loading={starting} onClick={startNextSession}>开始新一轮</Button>}
            </View>
          </View>
        </View>
      </AuthGuard>
    )
  }

  if (!currentQuestion) {
    return <AuthGuard><View className={styles.page}><PageHeader title='练习' shouldShowBack /><EmptyState title='暂未取得当前题，请稍后刷新' ><Button variant='primary' onClick={() => void advance()}>刷新当前题</Button></EmptyState></View></AuthGuard>
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={sessionTitle(session, requestedMode)} shouldShowBack />
        <ScrollView className={styles.body} scrollY>
          <View className={styles.sessionBar}><Text>{answeredCount} / {session.actual_count} 已作答</Text><Text className={styles.abandonLink} onClick={abandon}>放弃本轮</Text></View>
          <View className={styles.progressBar}><View className={styles.progressFill} style={{ width: `${(answeredCount / session.actual_count) * 100}%` }} /></View>
          <Text className={styles.progressText}>第 {currentQuestion.position} / {session.actual_count} 题</Text>

          <View className={styles.questionCard}>
            <View className={styles.questionHeader}>
              <Text className={styles.questionType}>{quizTypeLabel(currentQuestion.question_type)}</Text>
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
            {!currentQuestion.answered && <Button className={styles.answerButton} variant='gradient' size='lg' disabled={!selectedAnswer || submitting} loading={submitting} onClick={submitCurrent}>{submitting ? '提交中…' : '提交答案'}</Button>}
            {!currentQuestion.answered && session.scope_type && <Text className={styles.skipLink} onClick={() => void skipCurrent()}>{skipping ? '正在跳过…' : '暂时跳过（每题一次）'}</Text>}

            {displayedResult && (
              <View className={`${styles.feedback} ${displayedResult.is_correct ? styles.feedbackCorrect : styles.feedbackWrong}`}>
                <Text className={styles.feedbackText}>{displayedResult.is_correct ? '回答正确' : `回答错误，正确答案：${Array.isArray(displayedResult.correct_answer) ? displayedResult.correct_answer.join('、') : displayedResult.correct_answer}`}</Text>
                <Text className={styles.explanation}>解析：{displayedResult.explanation}</Text>
                <Text className={styles.attemptText}>本题已提交 {currentQuestion.attempt_count} 次</Text>
              </View>
            )}
          </View>

          <View className={styles.navRow}>
            <Button variant='secondary' onClick={() => {
              const previous = session.questions.filter(item => item.position < currentQuestion.position).sort((a, b) => b.position - a.position)[0]
              if (previous) setCurrentSessionQuestionId(previous.session_question_id)
            }} disabled={!session.questions.some(item => item.position < currentQuestion.position)}>查看上一题</Button>
            <Button variant='primary' loading={starting} onClick={() => void advance()} disabled={!currentQuestion.answered}>{answeredCount >= session.actual_count ? '查看结果' : '下一题'}</Button>
          </View>
        </ScrollView>
        <View className={styles.bottomBar}>
          <View className={styles.barItem} onClick={toggleCollection}>
            <Icon name={collectionIds.has(currentQuestion.id) ? 'star-filled' : 'star'} size={22} color={collectionIds.has(currentQuestion.id) ? '#FFB800' : '#999999'} />
            <Text>{collectionIds.has(currentQuestion.id) ? '已收藏' : '收藏'}</Text>
          </View>
          <View className={styles.barStat}>
            <Icon name='check' size={20} color='#52C41A' />
            <Text className={styles.barStatNum}>{correctCount}</Text>
          </View>
          <View className={styles.barStat}>
            <Icon name='close' size={20} color='#FF4D4F' />
            <Text className={styles.barStatNum}>{wrongCount}</Text>
          </View>
          <View className={styles.barDone} onClick={() => setDrawerVisible(true)}>
            <Text className={styles.barDoneCount}>{answeredCount}/{session.actual_count}</Text>
            <Text className={styles.barDoneLabel}>已做题</Text>
          </View>
        </View>
        <Popup visible={drawerVisible} position='bottom' round closeOnOverlayClick onClose={() => setDrawerVisible(false)}>
          <View className={styles.drawer}>
            <View className={styles.drawerHeader}>
              <Text className={styles.drawerTitle}>答题卡</Text>
              <Text className={styles.abandonLink} onClick={abandon}>放弃本轮</Text>
            </View>
            <ScrollView className={styles.drawerBody} scrollY>
              <View className={styles.drawerGrid}>
                {session.questions.map((question) => {
                  const isCorrect = question.latest_result?.is_correct === true
                  const isWrong = question.answered && question.latest_result?.is_correct === false
                  const isCurrent = question.session_question_id === currentQuestion.session_question_id
                  const dotClass = `${styles.drawerDot}${isCorrect ? ` ${styles.drawerDotCorrect}` : ''}${isWrong ? ` ${styles.drawerDotWrong}` : ''}${isCurrent ? ` ${styles.drawerDotCurrent}` : ''}`
                  return (
                    <View key={question.session_question_id} className={dotClass} onClick={() => { setCurrentSessionQuestionId(question.session_question_id); setDrawerVisible(false) }}>
                      <Text>{question.position}</Text>
                    </View>
                  )
                })}
              </View>
            </ScrollView>
          </View>
        </Popup>
      </View>
    </AuthGuard>
  )
}
