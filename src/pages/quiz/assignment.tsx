import { useCallback, useEffect, useState } from 'react'
import { Image, ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import type {
  CourseAssignmentAnswer,
  CourseAssignmentDetail,
  CourseAssignmentQuestion,
} from '@/contracts/courseAssignment'
import {
  getCourseAssignment,
  saveCourseAssignmentAnswers,
  startCourseAssignment,
  submitCourseAssignment,
  withdrawCourseAssignment,
} from '@/services/courseAssignmentService'
import styles from './assignment.module.scss'

const statusLabels: Record<CourseAssignmentDetail['display_status'], string> = {
  not_started: '未开始',
  draft: '作答中',
  submitted: '已提交，可撤回',
  reviewing: '评阅中',
  graded: '已评分',
}

function errorMessage(error: unknown) {
  return error instanceof Error && error.message !== 'UNAUTHORIZED'
    ? error.message
    : '操作失败，请稍后重试'
}

function answerToArray(answer: CourseAssignmentAnswer | null): string[] {
  return Array.isArray(answer) ? answer : answer ? [answer] : []
}

function typeLabel(type: CourseAssignmentQuestion['question_type']) {
  if (type === 'multiple_choice') return '多选题'
  if (type === 'judge') return '判断题'
  return type === 'essay' ? '问答题' : '单选题'
}

function answerText(answer: CourseAssignmentAnswer | null) {
  if (answer === null) return ''
  return Array.isArray(answer) ? answer.join('、') : answer
}

export default function CourseAssignmentPage() {
  const [assignmentId, setAssignmentId] = useState(0)
  const [detail, setDetail] = useState<CourseAssignmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [essayDrafts, setEssayDrafts] = useState<Record<number, string>>({})
  const [savingQuestionId, setSavingQuestionId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useLoad(options => {
    const id = Number(options?.assignmentId ?? options?.id ?? 0)
    setAssignmentId(id)
  })

  const applyDetail = useCallback((next: CourseAssignmentDetail) => {
    setDetail(next)
    setEssayDrafts(Object.fromEntries(next.questions.map(question => [
      question.question_id,
      typeof question.user_answer === 'string' ? question.user_answer : '',
    ])))
  }, [])

  const load = useCallback(async (start = false) => {
    if (!assignmentId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      applyDetail(start
        ? await startCourseAssignment(assignmentId)
        : await getCourseAssignment(assignmentId))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [applyDetail, assignmentId])

  useEffect(() => { void load(true) }, [load])

  const persistAnswer = async (
    question: CourseAssignmentQuestion,
    answer: CourseAssignmentAnswer | null,
  ) => {
    if (!detail?.can_edit || savingQuestionId) return
    setSavingQuestionId(question.question_id)
    try {
      await saveCourseAssignmentAnswers(assignmentId, [{
        question_id: question.question_id,
        user_answer: answer,
      }])
      setDetail(current => current && current.assignment_id === assignmentId ? {
        ...current,
        questions: current.questions.map(item => item.question_id === question.question_id ? {
          ...item,
          user_answer: answer,
          is_answered: answer !== null && !(typeof answer === 'string' && answer.trim() === ''),
        } : item),
      } : current)
      Taro.showToast({ title: '草稿已保存', icon: 'success' })
    } catch (err) {
      Taro.showToast({ title: errorMessage(err), icon: 'none' })
    } finally {
      setSavingQuestionId(null)
    }
  }

  const selectObjective = (question: CourseAssignmentQuestion, key: string) => {
    if (!detail?.can_edit) return
    let answer: CourseAssignmentAnswer | null
    if (question.question_type === 'multiple_choice') {
      const current = answerToArray(question.user_answer)
      answer = current.includes(key)
        ? current.filter(item => item !== key)
        : [...current, key].sort()
      if (answer.length === 0) answer = null
    } else {
      answer = question.user_answer === key ? null : key
    }
    setDetail(current => current && current.assignment_id === assignmentId ? {
      ...current,
      questions: current.questions.map(item => item.question_id === question.question_id ? {
        ...item,
        user_answer: answer,
        is_answered: answer !== null,
      } : item),
    } : current)
    void persistAnswer(question, answer)
  }

  const saveEssay = async (question: CourseAssignmentQuestion) => {
    const text = essayDrafts[question.question_id] ?? ''
    await persistAnswer(question, text.trim() ? text : null)
  }

  const submit = async () => {
    if (!detail?.can_submit || submitting) return
    const confirm = await Taro.showModal({
      title: '提交作业',
      content: '提交后客观题立即判分；有问答题时需等待管理员评阅。确定提交吗？',
    })
    if (!confirm.confirm) return
    setSubmitting(true)
    try {
      const answers = detail.questions.map(question => ({
        question_id: question.question_id,
        user_answer: question.is_essay
          ? (essayDrafts[question.question_id]?.trim() || null)
          : question.user_answer,
      }))
      if (answers.length) await saveCourseAssignmentAnswers(assignmentId, answers)
      await submitCourseAssignment(assignmentId)
      Taro.showToast({ title: '作业已提交', icon: 'success' })
      await load()
    } catch (err) {
      Taro.showToast({ title: errorMessage(err), icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  const withdraw = async () => {
    if (!detail?.can_withdraw) return
    const confirm = await Taro.showModal({
      title: '撤回作业',
      content: '撤回后可以继续修改答案并重新提交。管理员领取评阅后不可撤回。',
    })
    if (!confirm.confirm) return
    try {
      await withdrawCourseAssignment(assignmentId)
      Taro.showToast({ title: '作业已撤回', icon: 'success' })
      await load()
    } catch (err) {
      Taro.showToast({ title: errorMessage(err), icon: 'none' })
    }
  }

  const renderQuestion = (question: CourseAssignmentQuestion) => {
    const selected = answerToArray(question.user_answer)
    return (
      <View key={question.question_id} className={styles.questionCard}>
        <View className={styles.questionHeader}>
          <Text className={styles.questionType}>
            {question.position}/{detail?.questions.length ?? 0} · {typeLabel(question.question_type)}
          </Text>
          {detail?.can_edit && <Text className={styles.scoreText}>满分 {question.score.toFixed(2)} 分</Text>}
        </View>
        <Text className={styles.stem}>{question.question_text}</Text>
        {question.image_urls.map(url => (
          <Image key={url} className={styles.questionImage} src={url} mode='widthFix' />
        ))}
        {question.is_essay ? (
          <View>
            <Textarea
              className={styles.essayInput}
              value={essayDrafts[question.question_id] ?? ''}
              maxlength={5000}
              placeholder='请输入文字答案（空白不计为有效作答）'
              disabled={!detail?.can_edit}
              onInput={event => setEssayDrafts(current => ({
                ...current,
                [question.question_id]: String(event.detail.value ?? ''),
              }))}
            />
            {detail?.can_edit && (
              <Button size='sm' onClick={() => void saveEssay(question)} loading={savingQuestionId === question.question_id}>
                保存本题草稿
              </Button>
            )}
          </View>
        ) : (
          <View className={styles.options}>
            {Object.entries(question.options).map(([key, content]) => (
              <View
                key={key}
                className={`${styles.option} ${selected.includes(key) ? styles.optionSelected : ''}`}
                onClick={() => selectObjective(question, key)}
              >
                <Text className={selected.includes(key) ? styles.optionKeyActive : styles.optionKey}>{key}</Text>
                <View className={styles.optionBody}>
                  <Text className={styles.optionText}>{content}</Text>
                  {question.option_image_urls[key] && (
                    <Image className={styles.optionImage} src={question.option_image_urls[key]} mode='widthFix' />
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
        {!detail?.can_edit && (
          <View className={styles.submittedAnswer}>
            <Text className={styles.submittedAnswerLabel}>我的答案</Text>
            <Text className={styles.submittedAnswerText}>{answerText(question.user_answer) || '未作答'}</Text>
          </View>
        )}
        {detail?.result_available && (
          <View className={styles.reviewResult}>
            <Text className={styles.resultScore}>
              得分 {(question.earned_score ?? 0).toFixed(2)} / {question.score.toFixed(2)}
            </Text>
            {!question.is_essay && (
              <Text className={styles.resultAnswer}>正确答案：{answerText(question.correct_answer)}</Text>
            )}
            {question.explanation && <Text className={styles.explanation}>解析：{question.explanation}</Text>}
            {question.is_essay && question.review_comment && (
              <Text className={styles.reviewComment}>评语：{question.review_comment}</Text>
            )}
          </View>
        )}
      </View>
    )
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='课程作业' shouldShowBack />
        {loading && (
          <View className={styles.empty}><Text>正在加载作业…</Text></View>
        )}
        {!loading && error && (
          <View className={styles.empty}>
            <EmptyState title='作业加载失败' description={error} />
          </View>
        )}
        {!loading && !error && detail && (
          <>
            <ScrollView className={styles.body} scrollY>
              <View className={styles.statusCard}>
                <View>
                  <Text className={styles.libraryName}>{detail.library_name}</Text>
                  <Text className={styles.statusMeta}>
                    {statusLabels[detail.display_status]} · 共 {detail.questions.length} 题
                  </Text>
                </View>
                {detail.result_available && detail.total_score != null && (
                  <Text className={styles.totalScore}>{detail.total_score.toFixed(2)}分</Text>
                )}
              </View>
              {detail.status !== 'draft' && !detail.result_available && (
                <View className={styles.notice}>
                  <Text>人工评阅完成前不显示分数、正确答案和解析。</Text>
                </View>
              )}
              {detail.questions.map(renderQuestion)}
            </ScrollView>
            <View className={styles.bottomBar}>
              {detail.can_edit && (
                <Button variant='gradient' size='lg' onClick={() => void submit()} loading={submitting} disabled={submitting}>
                  提交作业
                </Button>
              )}
              {detail.can_withdraw && (
                <Button variant='secondary' size='lg' onClick={() => void withdraw()}>
                  撤回修改
                </Button>
              )}
            </View>
          </>
        )}
      </View>
    </AuthGuard>
  )
}
