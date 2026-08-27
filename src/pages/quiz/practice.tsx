import { useEffect, useMemo, useState } from 'react'
import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { Popup } from '@nutui/nutui-react-taro'
import { AuthGuard } from '@/components/AuthGuard'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { Icon } from '@/components/Icon'
import { PageHeader } from '@/components/PageHeader'
import type {
  QuizAnswer,
  QuizPracticeAttemptResult,
  QuizPracticeMode,
  QuizPracticeQuestionState,
  QuizPracticeScopePreview,
  QuizPracticeScopeType,
  QuizPracticeSession,
} from '@/contracts/quiz'
import {
  addQuizCollection,
  createPracticeSession,
  clearWrongBookItem,
  abandonPracticeSession,
  getCurrentPracticeSession,
  getPracticeSession,
  listQuizCollections,
  previewPracticeScope,
  removeQuizCollection,
  submitPracticeAttempt,
  submitPracticeSession,
} from '@/services/dataService'
import {
  cachePracticeSessionId,
  clearAttemptKey,
  clearCachedPracticeSessionId,
  getCachedPracticeSessionId,
  getOrCreateAttemptKey,
} from '@/utils/quizRuntime'
import { ApiError } from '@/utils/request'
import { answerIncludes, answerText, isMultipleChoice, quizImageUrls, quizOptions, relabeledQuizOptions, quizTypeLabel } from '@/utils/quizView'
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

function withAttempt(
  session: QuizPracticeSession,
  sessionQuestionId: number,
  result: QuizPracticeAttemptResult,
): QuizPracticeSession {
  const questions = session.questions.map(question => question.session_question_id === sessionQuestionId
    ? {
      ...question,
      answered: true,
      user_answer: result.user_answer,
      latest_result: result,
      attempt_count: question.attempt_count + 1,
    }
    : question)
  const answeredCount = questions.filter(question => question.user_answer !== null).length
  return {
    ...session,
    questions,
    answered_count: answeredCount,
    remaining_count: Math.max(0, session.actual_count - answeredCount),
  }
}

export default function QuizPracticePage() {
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [scopeType, setScopeType] = useState<QuizPracticeScopeType | null>(null)
  const [scopeId, setScopeId] = useState<number | null>(null)
  const [requestedMode, setRequestedMode] = useState<QuizPracticeMode>('normal')
  const [questionCount, setQuestionCount] = useState<number>(20)
  const [preview, setPreview] = useState<QuizPracticeScopePreview | null>(null)
  const [session, setSession] = useState<QuizPracticeSession | null>(null)
  const [currentSessionQuestionId, setCurrentSessionQuestionId] = useState<number | null>(null)
  const [collectionIds, setCollectionIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState<{ sessionQuestionId: number; answer: QuizAnswer } | null>(null)
  const [multiDraft, setMultiDraft] = useState<string[]>([])
  const [actionBusy, setActionBusy] = useState(false)
  const [collectionBusy, setCollectionBusy] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [drawerVisible, setDrawerVisible] = useState(false)

  const applySession = (next: QuizPracticeSession, preferredQuestionId?: number) => {
    setSession(next)
    if (next.status === 'in_progress' || next.status === 'paused') cachePracticeSessionId(next.id)
    else clearCachedPracticeSessionId(next.id)
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

  const currentResult = currentQuestion?.latest_result ?? null
  const isSettled = currentResult !== null
  const submittingThis = submitting !== null && submitting.sessionQuestionId === currentQuestion?.session_question_id
  const selectedAnswer: QuizAnswer | null = isSettled
    ? currentResult.user_answer
    : currentQuestion && isMultipleChoice(currentQuestion.question_type)
      ? (multiDraft.length > 0 ? [...multiDraft] : null)
      : (submittingThis && submitting ? submitting.answer : currentQuestion?.user_answer ?? null)

  useEffect(() => {
    const saved = currentQuestion?.user_answer
    setMultiDraft(Array.isArray(saved) ? [...saved] : [])
  }, [currentQuestion?.session_question_id, currentQuestion?.user_answer])

  const submitAttempt = async (question: QuizPracticeQuestionState, answer: QuizAnswer) => {
    if (!session || session.status !== 'in_progress' || submitting !== null || actionBusy) return
    if (question.latest_result !== null) return
    setSubmitting({ sessionQuestionId: question.session_question_id, answer })
    try {
      const result = await submitPracticeAttempt(session.id, {
        session_question_id: question.session_question_id,
        idempotency_key: getOrCreateAttemptKey(session.id, question.session_question_id, answer),
        user_answer: answer,
      })
      clearAttemptKey(session.id, question.session_question_id)
      setSession(current => current
        ? withAttempt(current, question.session_question_id, result)
        : current)
      const allAttempted = session.questions.every(item => item.session_question_id === question.session_question_id || item.latest_result !== null)
      if (allAttempted) {
        try { applySession(await getPracticeSession(session.id)) } catch { /* 结果页加载失败时保留本地判分展示 */ }
      }
    } catch (error) {
      if (error instanceof ApiError && (error.statusCode === 409 || error.code === 40201)) {
        try {
          applySession(await getPracticeSession(session.id), question.session_question_id)
          Taro.showToast({ title: '已加载服务端最新判分结果', icon: 'none', duration: 2500 })
        } catch {
          Taro.showToast({ title: '判分状态同步失败，请重新进入练习', icon: 'none', duration: 3000 })
        }
      } else {
        Taro.showToast({ title: `提交失败：${errorMessage(error)}`, icon: 'none', duration: 2500 })
      }
    } finally {
      setSubmitting(null)
    }
  }

  const handleOptionClick = (question: QuizPracticeQuestionState, label: string) => {
    if (!session || session.status !== 'in_progress' || submitting !== null || actionBusy) return
    if (question.latest_result !== null) return
    if (isMultipleChoice(question.question_type)) {
      setMultiDraft(previous => previous.includes(label)
        ? previous.filter(value => value !== label)
        : [...previous, label].sort())
      return
    }
    void submitAttempt(question, label)
  }

  const refreshSession = async () => {
    if (!session || starting) return
    setStarting(true)
    try { applySession(await getPracticeSession(session.id), currentSessionQuestionId ?? undefined) }
    catch (error) { Taro.showToast({ title: errorMessage(error), icon: 'none' }) }
    finally { setStarting(false) }
  }

  const submit = () => {
    if (!session || session.status !== 'in_progress' || actionBusy || submitting !== null) return
    setDrawerVisible(false)
    const unanswered = session.questions.filter(question => question.user_answer === null).length
    Taro.showModal({
      title: '确认交卷',
      content: unanswered > 0
        ? `还有 ${unanswered} 题未作答。交卷后不能修改，确定继续吗？`
        : '全部题目均已作答，交卷后不能修改。',
      confirmText: '确认交卷',
      cancelText: '继续作答',
      success: async result => {
        if (!result.confirm) return
        setActionBusy(true)
        try {
          applySession(await submitPracticeSession(session.id), currentSessionQuestionId ?? undefined)
        } catch (error) {
          Taro.showToast({ title: errorMessage(error), icon: 'none' })
        } finally {
          setActionBusy(false)
        }
      },
    })
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

  const openPracticeHistory = async () => {
    try {
      await Taro.navigateTo({ url: '/pages/quiz/history' })
    } catch (error) {
      Taro.showToast({ title: `打开练习历史失败：${errorMessage(error)}`, icon: 'none' })
    }
  }

  const startNextSession = async () => {
    if (!session || starting) return
    setLoadError('')
    if (session.scope_type && session.scope_id && (session.mode === 'full' || session.mode === 'wrong_only')) {
      await prepareV2Session(session.scope_type, session.scope_id, session.mode)
    } else {
      await startLegacySession(session.mode === 'wrong' ? 'wrong' : 'normal', session.category_id, session.requested_count)
    }
  }

  const answeredCount = session?.questions.filter(question => question.user_answer !== null).length ?? 0
  const correctCount = session?.questions.filter(question => question.is_correct === true).length ?? 0
  const wrongCount = session?.questions.filter(question => question.is_correct === false).length ?? 0
  const optionItems = useMemo(() => currentQuestion && session
    ? relabeledQuizOptions(currentQuestion.options, `${session.id}:${currentQuestion.id}:${currentQuestion.position}`)
    : [], [currentQuestion, session?.id])
  const currentImageUrls = quizImageUrls(currentQuestion?.image_urls)
  const previewQuestionImages = (current: string) => {
    const urls = [
      ...currentImageUrls,
      ...optionItems.flatMap(option => {
        const url = currentQuestion?.option_image_urls?.[option.originalLabel]
        return url ? [url] : []
      }),
    ]
    if (urls.length > 0) Taro.previewImage({ urls, current: urls.includes(current) ? current : urls[0] })
  }

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
        <View className={styles.resultActions}><Button variant='secondary' size='lg' onClick={() => void refreshSession()}>检查是否恢复</Button><Button variant='secondary' size='lg' onClick={() => Taro.navigateBack()}>返回题库</Button></View>
      </View></View></AuthGuard>
    )
  }

  if (session.status !== 'in_progress') {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={sessionTitle(session, requestedMode)} shouldShowBack />
          <ScrollView className={styles.resultScroll} scrollY>
            <View className={styles.resultCard}>
              <Text className={styles.resultScore}>{terminalLabel(session.status)}</Text>
              <Text className={styles.resultAccuracy}>答对 {correctCount} / 答错 {wrongCount} / 未答 {session.actual_count - answeredCount}</Text>
              <Text className={styles.resultHint}>完整的每次作答记录可在练习历史中查看。</Text>
            </View>
            {session.status === 'completed' && (
              <View className={styles.resultList}>
                {session.questions.map(question => (
                  <View key={question.session_question_id} className={styles.resultQuestionCard}>
                    <Text className={question.is_correct === true ? styles.resultCorrect : question.is_correct === false ? styles.resultWrong : styles.resultUnanswered}>
                      {question.position}. {question.is_correct === true ? '回答正确' : question.is_correct === false ? '回答错误' : '未作答'}
                    </Text>
                    <Text className={styles.resultStem}>{question.question_text}</Text>
                    {quizImageUrls(question.image_urls).length > 0 && (
                      <View className={styles.questionImages}>
                        {quizImageUrls(question.image_urls).map(url => <Image key={url} className={styles.questionImage} src={url} mode='widthFix' />)}
                      </View>
                    )}
                    <Text className={styles.resultAnswer}>你的答案：{answerText(question.user_answer)}　正确答案：{answerText(question.correct_answer)}</Text>
                    {question.explanation && <Text className={styles.resultExplanation}>解析：{question.explanation}</Text>}
                  </View>
                ))}
              </View>
            )}
            {loadError && <Text className={styles.errorText}>{loadError}</Text>}
            <View className={styles.resultActions}>
              <Button variant='secondary' size='lg' onClick={() => void openPracticeHistory()}>查看练习历史</Button>
              {session.status !== 'terminated' && <Button variant='gradient' size='lg' loading={starting} onClick={() => void startNextSession()}>开始新一轮</Button>}
            </View>
          </ScrollView>
        </View>
      </AuthGuard>
    )
  }

  if (!currentQuestion) {
    return <AuthGuard><View className={styles.page}><PageHeader title='练习' shouldShowBack /><EmptyState title='暂未取得当前题，请稍后刷新' ><Button variant='primary' onClick={() => void refreshSession()}>刷新当前题</Button></EmptyState></View></AuthGuard>
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={sessionTitle(session, requestedMode)} shouldShowBack />
        <ScrollView className={styles.body} scrollY>
          <Text className={styles.progressText}>第 {currentQuestion.position} / {session.actual_count} 题</Text>

          <View className={styles.questionCard}>
            <View className={styles.questionHeader}>
              <Text className={styles.questionType}>{quizTypeLabel(currentQuestion.question_type)}</Text>
              <Text className={styles.saveState}>{submittingThis ? '判分中…' : isSettled ? '已作答' : '未作答'}</Text>
            </View>
            <Text className={styles.pathText}>{currentQuestion.category_path.map(item => item.name).join(' / ')}</Text>
            <Text className={styles.stem}>{currentQuestion.question_text}</Text>
            {currentImageUrls.length > 0 && (
              <View className={styles.questionImages}>
                {currentImageUrls.map(url => <Image key={url} className={styles.questionImage} src={url} mode='widthFix' />)}
              </View>
            )}
            <View className={styles.options}>
              {optionItems.map(option => {
                const selected = !isSettled && answerIncludes(selectedAnswer, option.originalLabel)
                const correctOption = isSettled && answerIncludes(currentResult.correct_answer, option.originalLabel)
                const wrongOption = isSettled && !correctOption && answerIncludes(currentResult.user_answer, option.originalLabel)
                return (
                  <View
                    key={option.originalLabel}
                    className={`${styles.option} ${correctOption ? styles.optionCorrect : wrongOption ? styles.optionWrong : selected ? styles.optionSelected : ''}`}
                    onClick={() => handleOptionClick(currentQuestion, option.originalLabel)}
                  >
                    <View className={`${styles.optionLabel} ${correctOption ? styles.optionLabelCorrect : wrongOption ? styles.optionLabelWrong : selected ? styles.optionLabelActive : ''}`}><Text>{option.label}</Text></View>
                    <View className={styles.optionBody}>
                      {option.text && <Text className={styles.optionText}>{option.text}</Text>}
                      {currentQuestion.option_image_urls?.[option.originalLabel] && (
                        <Image
                          className={styles.optionImage}
                          src={currentQuestion.option_image_urls[option.originalLabel]}
                          mode='widthFix'
                          onClick={e => { e.stopPropagation(); previewQuestionImages(currentQuestion.option_image_urls![option.originalLabel]) }}
                        />
                      )}
                    </View>
                  </View>
                )
              })}
            </View>
            {isSettled ? (
              <View className={`${styles.feedback} ${currentResult.is_correct ? styles.feedbackCorrect : styles.feedbackWrong}`}>
                <Text className={styles.feedbackText}>{currentResult.is_correct ? '回答正确' : '回答错误'}</Text>
                <Text className={styles.explanation}>你的答案：{answerText(currentResult.user_answer)}　正确答案：{answerText(currentResult.correct_answer)}</Text>
                {currentResult.explanation && <Text className={styles.explanation}>解析：{currentResult.explanation}</Text>}
              </View>
            ) : (
              <>
                {isMultipleChoice(currentQuestion.question_type) && (
                  <View className={styles.answerButton}>
                    <Button variant='gradient' size='lg' disabled={multiDraft.length === 0} loading={submittingThis} onClick={() => void submitAttempt(currentQuestion, [...multiDraft])}>确认答案</Button>
                  </View>
                )}
                <Text className={styles.noResultHint}>{isMultipleChoice(currentQuestion.question_type) ? '选择选项后点「确认答案」提交判分；答案提交后不可修改。' : '点击选项立即判分并展示解析；答案提交后不可修改。'}</Text>
              </>
            )}
          </View>

        </ScrollView>

        <View className={styles.bottomBar}>
          <View
            className={`${styles.navItem} ${!session.questions.some(item => item.position < currentQuestion.position) ? styles.navItemDisabled : ''}`}
            onClick={() => {
              if (!session.questions.some(item => item.position < currentQuestion.position)) return
              const previous = session.questions.filter(item => item.position < currentQuestion.position).sort((a, b) => b.position - a.position)[0]
              if (previous) setCurrentSessionQuestionId(previous.session_question_id)
            }}
          >
            <Icon name='quiz-prev' size={22} color={!session.questions.some(item => item.position < currentQuestion.position) ? '#C0C4CC' : '#666666'} />
            <Text className={styles.navItemText}>上一题</Text>
          </View>

          <View className={styles.navItem} onClick={() => setDrawerVisible(true)}>
            <Icon name='quiz-answer-card' size={22} color='#333333' />
            <Text className={styles.navItemText}>答题卡</Text>
          </View>

          <View className={styles.navItem} onClick={toggleCollection}>
            <Icon name={collectionIds.has(currentQuestion.id) ? 'star-filled' : 'star'} size={22} color={collectionIds.has(currentQuestion.id) ? '#FFB800' : '#999999'} />
            <Text className={styles.navItemText}>{collectionIds.has(currentQuestion.id) ? '已收藏' : '收藏'}</Text>
          </View>

          {(session.mode === 'wrong' || session.mode === 'wrong_only' || requestedMode === 'wrong' || requestedMode === 'wrong_only') && (
            <View
              className={styles.navItem}
              onClick={() => {
                Taro.showModal({
                  title: '移出错题本',
                  content: '将这道题从错题本中移出？移出后不会再出现在错题专项练习中。',
                  confirmText: '移出',
                  cancelText: '取消',
                  success: async result => {
                    if (!result.confirm) return
                    try {
                      const { cleared } = await clearWrongBookItem(currentQuestion.id)
                      Taro.showToast({ title: cleared ? '已移出错题本' : '该题不在错题本中', icon: 'none', duration: 1500 })
                      // Remove only this question from the local session view;
                      // answered questions and progress stay intact.
                      if (cleared) {
                        const remaining = session.questions.filter(
                          item => item.session_question_id !== currentQuestion.session_question_id
                        )
                        const next = remaining.find(item => item.position > currentQuestion.position)
                          ?? remaining.find(item => !item.answered)
                          ?? remaining[0]
                        setSession({
                          ...session,
                          questions: remaining,
                          remaining_count: Math.max(0, session.remaining_count - 1),
                        })
                        setCurrentSessionQuestionId(next?.session_question_id ?? null)
                      }
                    } catch (err) {
                      Taro.showToast({ title: err instanceof Error && err.message !== 'UNAUTHORIZED' ? err.message : '移出失败，请重试', icon: 'none', duration: 2500 })
                    }
                  },
                })
              }}
            >
              <Icon name='quiz-remove' size={22} color='#F56C6C' />
              <Text className={styles.navItemText}>移出</Text>
            </View>
          )}

          <View
            className={styles.navItem}
            onClick={() => {
              if (session.questions.some(item => item.position > currentQuestion.position)) {
                const next = session.questions.find(item => item.position > currentQuestion.position)
                if (next) setCurrentSessionQuestionId(next.session_question_id)
              } else {
                submit()
              }
            }}
          >
            <Icon name='quiz-next' size={22} color='#1677FF' />
            <Text className={`${styles.navItemText} ${styles.navItemTextActive}`}>
              {session.questions.some(item => item.position > currentQuestion.position) ? '下一题' : '交卷'}
            </Text>
          </View>
        </View>

        <Popup visible={drawerVisible} position='bottom' round closeOnOverlayClick onClose={() => setDrawerVisible(false)}>
          <View className={styles.drawer}>
            <View className={styles.drawerHeader}>
              <Text className={styles.drawerTitle}>答题卡</Text>
              <Text className={styles.submitLink} onClick={submit}>交卷</Text>
            </View>
            <ScrollView className={styles.drawerBody} scrollY>
              <View className={styles.drawerGrid}>
                {session.questions.map((question) => {
                  const isCurrent = question.session_question_id === currentQuestion.session_question_id
                  const answeredClass = question.latest_result?.is_correct === true
                    ? styles.drawerDotCorrect
                    : question.latest_result?.is_correct === false
                      ? styles.drawerDotWrong
                      : styles.drawerDotAnswered
                  const dotClass = `${styles.drawerDot}${question.user_answer !== null ? ` ${answeredClass}` : ''}${isCurrent ? ` ${styles.drawerDotCurrent}` : ''}`
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
