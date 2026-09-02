import { useEffect, useState } from 'react'
import { View, Text, Input, Textarea, Radio, Checkbox, Slider } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { getQuizPaper, submitQuiz } from '@/services/classroomService'
import type { ClassroomQuizPaper } from '@/types/classroom'
import styles from './quiz.module.scss'

export default function ClassroomQuizPage() {
  const { params } = useRouter()
  const quizId = Number(params?.id)
  const [paper, setPaper] = useState<ClassroomQuizPaper | null>(null)
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [remaining, setRemaining] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!quizId) { setLoading(false); return }
    getQuizPaper(quizId)
      .then((p) => {
        setPaper(p)
        setRemaining(Math.max(0, Math.floor((new Date(p.ends_at).getTime() - Date.now()) / 1000)))
      })
      .catch(() => setPaper(null))
      .finally(() => setLoading(false))
  }, [quizId])

  // 倒计时
  useEffect(() => {
    if (!paper) return
    const timer = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000)
    return () => clearInterval(timer)
  }, [paper])

  const setAnswer = (qid: number, value: string) =>
    setAnswers((prev) => ({ ...prev, [String(qid)]: value }))

  const toggleMulti = (qid: number, index: number) => {
    const key = String(qid)
    const current = (answers[key] || '').split(',').filter(Boolean)
    const idx = current.indexOf(String(index))
    if (idx >= 0) current.splice(idx, 1)
    else current.push(String(index))
    setAnswer(qid, current.sort().join(','))
  }

  const doSubmit = async () => {
    if (!paper || submitting) return
    const unanswered = paper.questions.filter((q) => !(answers[String(q.id)] || '').trim()).length
    if (unanswered > 0) {
      const { confirm } = await Taro.showModal({
        title: '还有未作答题目',
        content: `剩余 ${unanswered} 题未作答，确认交卷？`,
      })
      if (!confirm) return
    }
    setSubmitting(true)
    try {
      await submitQuiz(quizId, answers)
      Taro.showToast({ title: '已提交，等待老师批改', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 1200)
    } catch { /* request 层 toast */ } finally {
      setSubmitting(false)
    }
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={paper?.title || '随堂测验'} shouldShowBack />
        {paper && (
          <View className={styles.countdown}>
            <Text className={remaining < 300 ? styles.countdownWarn : styles.countdownText}>
              剩余 {mm}:{ss}
            </Text>
          </View>
        )}
        <View className={styles.body}>
          {loading && <View className={styles.empty}>加载中…</View>}
          {!loading && !paper && <View className={styles.empty}>测验不存在或已结束</View>}

          {paper?.questions.map((q, i) => (
            <View key={q.id} className={styles.question}>
              <View className={styles.stemRow}>
                <Text className={styles.stemIndex}>{i + 1}.</Text>
                <Text className={styles.stem}>{q.stem}</Text>
                <Text className={styles.score}>({q.score}分)</Text>
              </View>

              {(q.type === 'single' || q.type === 'judge') && (
                <Radio.Group onChange={(e) => setAnswer(q.id, String(e.detail.value))} value={answers[String(q.id)]}>
                  {(q.type === 'judge' ? ['正确', '错误'] : (q.options ?? [])).map((opt, oi) => (
                    <Radio key={oi} value={q.type === 'judge' ? (oi === 0 ? 'true' : 'false') : String(oi)} className={styles.option}>
                      {q.type === 'judge' ? opt : `${String.fromCharCode(65 + oi)}. ${opt}`}
                    </Radio>
                  ))}
                </Radio.Group>
              )}

              {q.type === 'multiple' && (
                <Checkbox.Group onChange={(vals) => setAnswer(q.id, (vals as string[]).sort().join(','))}>
                  {(q.options ?? []).map((opt, oi) => (
                    <Checkbox key={oi} value={String(oi)} className={styles.option}>
                      {`${String.fromCharCode(65 + oi)}. ${opt}`}
                    </Checkbox>
                  ))}
                </Checkbox.Group>
              )}

              {q.type === 'blank' && (
                <Input
                  className={styles.input}
                  placeholder='填写答案'
                  value={answers[String(q.id)] || ''}
                  onInput={(e) => setAnswer(q.id, e.detail.value)}
                />
              )}

              {q.type === 'short' && (
                <Textarea
                  className={styles.textarea}
                  placeholder='输入解答'
                  value={answers[String(q.id)] || ''}
                  onInput={(e) => setAnswer(q.id, e.detail.value)}
                  maxlength={2000}
                />
              )}
            </View>
          ))}

          {paper && (
            <Button variant='primary' disabled={submitting} onClick={doSubmit} className={styles.submit}>
              {submitting ? '提交中…' : '交卷'}
            </Button>
          )}
        </View>
      </View>
    </AuthGuard>
  )
}
