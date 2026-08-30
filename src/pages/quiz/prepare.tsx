import { useEffect, useState } from 'react'
import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { ROUTES } from '@/constants/routes'
import type { QuizLibraryProgress, QuizPracticeScopePreview, QuizPracticeScopeType } from '@/contracts/quiz'
import { createQuizExam, getCurrentQuizExam, getQuizLibraryProgress, previewPracticeScope } from '@/services/dataService'
import { ApiError } from '@/utils/request'
import styles from './prepare.module.scss'

const QUESTION_COUNTS = [10, 20, 50, 100] as const
const MIN_EXAM_QUESTIONS = 10

interface ScopeProgress {
  question_count: number
  answered_questions: number
}

function isScopeType(value: string | undefined): value is QuizPracticeScopeType {
  return value === 'library' || value === 'module' || value === 'knowledge_point'
}

function messageOf(error: unknown): string {
  return error instanceof Error && error.message !== 'UNAUTHORIZED' ? error.message : '操作失败，请稍后重试'
}

function isConflict(error: unknown): boolean {
  return error instanceof ApiError && (error.statusCode === 409 || error.code === 40201)
}

function findScopeProgress(
  progress: QuizLibraryProgress,
  scopeType: QuizPracticeScopeType,
  scopeId: number,
): ScopeProgress | null {
  if (scopeType === 'library') {
    return { question_count: progress.question_count, answered_questions: progress.answered_questions }
  }
  if (scopeType === 'module') {
    const module = progress.modules.find(item => item.module_id === scopeId)
    return module
      ? { question_count: module.question_count, answered_questions: module.answered_questions }
      : null
  }
  for (const module of progress.modules) {
    const point = module.knowledge_points.find(item => item.knowledge_point_id === scopeId)
    if (point) {
      return { question_count: point.question_count, answered_questions: point.answered_questions }
    }
  }
  return null
}

export default function QuizPreparePage() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [scopeName, setScopeName] = useState('当前范围')
  const [preview, setPreview] = useState<QuizPracticeScopePreview | null>(null)
  const [scopeProgress, setScopeProgress] = useState<ScopeProgress | null>(null)
  const [reciteMode, setReciteMode] = useState(true)
  const [questionCount, setQuestionCount] = useState<number>(20)
  const [starting, setStarting] = useState(false)

  const load = async (scopeType: QuizPracticeScopeType, scopeId: number) => {
    setLoading(true)
    setLoadError('')
    try {
      const nextPreview = await previewPracticeScope({ scope_type: scopeType, scope_id: scopeId })
      setPreview(nextPreview)
      try {
        const libraryProgress = await getQuizLibraryProgress(nextPreview.library_id)
        setScopeProgress(findScopeProgress(libraryProgress, scopeType, scopeId))
      } catch {
        // Progress is informational; the preview alone is enough to start.
        setScopeProgress(null)
      }
    } catch (error) {
      setLoadError(messageOf(error))
    } finally {
      setLoading(false)
    }
  }

  useLoad(options => {
    const scopeId = Number(options?.scopeId)
    const nextScopeType = isScopeType(options?.scopeType) ? options.scopeType : undefined
    if (options?.scopeName) setScopeName(decodeURIComponent(options.scopeName))
    if (!nextScopeType || !Number.isInteger(scopeId) || scopeId <= 0) {
      setLoadError('缺少练习范围，请从题库目录重新进入')
      setLoading(false)
      return
    }
    void load(nextScopeType, scopeId)
  })

  const scopeQuestionCount = scopeProgress?.question_count ?? preview?.question_count ?? 0
  const answeredCount = scopeProgress?.answered_questions ?? 0
  const unansweredCount = Math.max(0, scopeQuestionCount - answeredCount)
  const availableCounts = QUESTION_COUNTS.filter(count => count <= scopeQuestionCount)
  const examEnabled = scopeQuestionCount >= MIN_EXAM_QUESTIONS

  useEffect(() => {
    if (scopeQuestionCount > 0 && questionCount > scopeQuestionCount) {
      const fallback = QUESTION_COUNTS.filter(count => count <= scopeQuestionCount).pop()
      if (fallback) setQuestionCount(fallback)
    }
  }, [scopeQuestionCount, questionCount])

  const start = () => {
    if (loading || starting || !preview) return
    if (!reciteMode && !examEnabled) return
    if (reciteMode) {
      Taro.navigateTo({
        url: `/${ROUTES.QUIZ_PRACTICE}?scopeType=${preview.scope_type}&scopeId=${preview.scope_id}`,
      })
      return
    }
    setStarting(true)
    createQuizExam({
      scope_type: preview.scope_type,
      scope_id: preview.scope_id,
      question_count: questionCount,
    })
      .then(exam => {
        Taro.navigateTo({ url: `/${ROUTES.QUIZ_MOCK}?examId=${exam.id}` })
      })
      .catch(async error => {
        if (!isConflict(error)) {
          Taro.showToast({ title: messageOf(error), icon: 'none', duration: 2500 })
          return
        }
        const current = await getCurrentQuizExam().catch(() => null)
        if (!current || current.status !== 'in_progress') {
          Taro.showToast({ title: '已有进行中的考试，请稍后重试', icon: 'none', duration: 2500 })
          return
        }
        Taro.showModal({
          title: '已有一场进行中的考试',
          content: '同一时间只能有一场考试。可以继续未完成的考试，也可以先交卷或放弃后再开新考试。',
          confirmText: '继续考试',
          cancelText: '取消',
          success: result => {
            if (result.confirm) {
              Taro.navigateTo({ url: `/${ROUTES.QUIZ_MOCK}?examId=${current.id}` })
            }
          },
        })
      })
      .finally(() => setStarting(false))
  }

  const lastRound = preview?.last_completed_session ?? null
  const lastRoundAccuracy = lastRound?.accuracy

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='开始练习' shouldShowBack />
        <ScrollView className={styles.body} scrollY>
          {loading && <Text className={styles.stateText}>正在加载练习范围…</Text>}
          {!loading && loadError && <EmptyState title={loadError} />}
          {!loading && !loadError && preview && (
            <View className={styles.content}>
              <View className={styles.scopeCard}>
                <Text className={styles.scopeName}>{scopeName}</Text>
                <View className={styles.statsRow}>
                  <View className={styles.statsItem}>
                    <Text className={styles.statsValue}>{scopeQuestionCount}</Text>
                    <Text className={styles.statsLabel}>总题量</Text>
                  </View>
                  <View className={styles.statsItem}>
                    <Text className={styles.statsValue}>{scopeProgress ? answeredCount : '—'}</Text>
                    <Text className={styles.statsLabel}>已做题数</Text>
                  </View>
                  <View className={styles.statsItem}>
                    <Text className={styles.statsValue}>{scopeProgress ? unansweredCount : '—'}</Text>
                    <Text className={styles.statsLabel}>未做题数</Text>
                  </View>
                </View>
                <View className={styles.lastRoundRow}>
                  <Text className={styles.lastRoundLabel}>最近一轮正确率</Text>
                  <Text className={styles.lastRoundValue}>
                    {lastRoundAccuracy === null || lastRoundAccuracy === undefined ? '—' : `${lastRoundAccuracy}%`}
                  </Text>
                </View>
                {preview.unfinished_session_id && (
                  <Text className={styles.resumeHint}>该范围有一轮练习未完成，进入练习后会提示继续或重新开始。</Text>
                )}
              </View>

              <View className={styles.modeCard}>
                <View className={styles.modeHeader} onClick={() => setReciteMode(previous => !previous)}>
                  <View className={styles.modeInfo}>
                    <Text className={styles.modeTitle}>背题模式</Text>
                    <Text className={styles.modeDescription}>
                      {reciteMode
                        ? '开启后逐题作答，提交后立即显示对错、正确答案与解析。'
                        : '已切换为考试模式：随机抽题、限时 60 分钟，交卷后才显示对错。'}
                    </Text>
                  </View>
                  <View className={`${styles.toggle} ${reciteMode ? styles.toggleOn : styles.toggleOff}`}>
                    <View className={styles.toggleKnob} />
                  </View>
                </View>
                {!reciteMode && (
                  <View className={styles.examSettings}>
                    {examEnabled ? (
                      <>
                        <Text className={styles.countTitle}>考试题量（随机抽取）</Text>
                        <View className={styles.countGrid}>
                          {availableCounts.map(count => (
                            <View
                              key={count}
                              className={`${styles.countItem} ${questionCount === count ? styles.countItemActive : ''}`}
                              onClick={() => setQuestionCount(count)}
                            >
                              <Text>{count} 题</Text>
                            </View>
                          ))}
                        </View>
                      </>
                    ) : (
                      <Text className={styles.examDisabledHint}>
                        该范围仅 {scopeQuestionCount} 题，不足 {MIN_EXAM_QUESTIONS} 题无法开考，请使用背题模式练习。
                      </Text>
                    )}
                  </View>
                )}
              </View>

              <Button
                variant='gradient'
                size='lg'
                loading={starting}
                disabled={starting || (!reciteMode && !examEnabled)}
                onClick={start}
              >
                {reciteMode ? '开始练习' : '开始考试'}
              </Button>
            </View>
          )}
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
