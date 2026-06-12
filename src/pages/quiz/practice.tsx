import { useState, useMemo, useCallback } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import { getQuizQuestions, submitQuizAnswer, addFavorite, removeFavorite, addWrongBook, removeWrongBook } from '@/services/dataService'
import type { QuizQuestion } from '@/types'
import styles from './practice.module.scss'

type Mode = 'practice' | 'mock' | 'challenge' | 'assessment'

export default function QuizPracticePage() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number | number[]>>({})
  const [mode, setMode] = useState<Mode>('practice')
  const [showResult, setShowResult] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [wrongBook, setWrongBook] = useState<Set<string>>(new Set())

  useLoad((options) => {
    const categoryId = options?.categoryId
    const modeParam = options?.mode as Mode | undefined
    if (modeParam) setMode(modeParam)
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    getQuizQuestions(categoryId || undefined).then(setQuestions).catch(() => {})
  })

  const currentQuestion = questions[currentIndex]
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : undefined

  const handleSelectSingle = useCallback((questionId: string, optIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: optIndex }))
    const q = questions.find(q => q.id === questionId)
    if (q) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      submitQuizAnswer({ question_id: Number(questionId), user_answer: String(optIndex) })
    }
  }, [questions, answers])

  const handleSelectMultiple = useCallback((questionId: string, optIndex: number) => {
    setAnswers(prev => {
      const cur = (prev[questionId] as number[]) || []
      const next = cur.includes(optIndex) ? cur.filter(i => i !== optIndex) : [...cur, optIndex]
      return { ...prev, [questionId]: next }
    })
    const q = questions.find(q => q.id === questionId)
    if (q) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      const cur = (answers[questionId] as number[]) || []
      const next = cur.includes(optIndex) ? cur.filter(i => i !== optIndex) : [...cur, optIndex]
      submitQuizAnswer({ question_id: Number(questionId), user_answer: JSON.stringify(next.sort()) })
    }
  }, [questions, answers])

  const isCorrect = useMemo(() => {
    if (!currentQuestion || selectedAnswer === undefined) return null
    if (currentQuestion.type === 'single') {
      return selectedAnswer === currentQuestion.correctAnswer
    }
    const correct = currentQuestion.correctAnswer as number[]
    const selected = (selectedAnswer as number[]) || []
    return correct.length === selected.length && correct.every(c => selected.includes(c))
  }, [currentQuestion, selectedAnswer])

  const correctCount = questions.filter(q => {
    const ans = answers[q.id]
    if (ans === undefined) return false
    if (q.type === 'single') return ans === q.correctAnswer
    const correct = q.correctAnswer as number[]
    const selected = (ans as number[]) || []
    return correct.length === selected.length && correct.every(c => selected.includes(c))
  }).length

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1)
    }
  }
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1)
    }
  }

  const handleToggleFavorite = useCallback((id: number) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        removeFavorite(id)
      } else {
        next.add(id)
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        addFavorite(id)
      }
      return next
    })
  }, [])

  const handleToggleWrongBook = useCallback((id: number) => {
    setWrongBook(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        removeWrongBook(id)
      } else {
        next.add(id)
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        addWrongBook(id)
      }
      return next
    })
  }, [])

  const handleSubmit = () => setShowResult(true)

  if (showResult) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.QUIZ_HEADER} shouldShowBack />
          <View className={styles.resultBody}>
            <View className={styles.resultCard}>
              <Text className={styles.resultScore}>
                {STRINGS.QUIZ_RESULT_SCORE}: {correctCount} / {questions.length}
              </Text>
              <Text className={styles.resultAccuracy}>
                {STRINGS.QUIZ_RESULT_ACCURACY}: {questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0}%
              </Text>
            </View>
            <View className={styles.btnWrap}>
              <Button variant='gradient' size='lg' onClick={() => {
                setShowResult(false)
                setCurrentIndex(0)
                setAnswers({})
              }}>
                {STRINGS.QUIZ_REDO}
              </Button>
            </View>
          </View>
        </View>
      </AuthGuard>
    )
  }

  if (!currentQuestion) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.QUIZ_HEADER} shouldShowBack />
          <View className={styles.resultBody}>
            <Text>{STRINGS.QUIZ_NO_QUESTIONS}</Text>
          </View>
        </View>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.QUIZ_HEADER} shouldShowBack />
        <ScrollView className={styles.body} scrollY>
          <View className={styles.progressBar}>
            <View className={styles.progressFill} style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
          </View>
          <Text className={styles.progressText}>
            {currentIndex + 1} / {questions.length}
          </Text>

          <View className={styles.questionCard}>
            <View className={styles.questionHeader}>
              <Text className={styles.questionType}>
                {currentQuestion.type === 'single' ? STRINGS.QUIZ_TYPE_SINGLE : STRINGS.QUIZ_TYPE_MULTIPLE}
              </Text>
              <View className={styles.headerActions}>
                <Text className={styles.actionBtn} onClick={() => handleToggleFavorite(currentQuestion.id)}>
                  {favorites.has(currentQuestion.id) ? STRINGS.QUIZ_UNCOLLECT : STRINGS.QUIZ_COLLECT}
                </Text>
                <Text className={styles.actionBtn} onClick={() => handleToggleWrongBook(currentQuestion.id)}>
                  {wrongBook.has(currentQuestion.id) ? STRINGS.QUIZ_WRONG_BOOK_REMOVE : STRINGS.QUIZ_WRONG_BOOK_ADD}
                </Text>
              </View>
            </View>
            <Text className={styles.stem}>{currentQuestion.stem}</Text>

            <View className={styles.options}>
              {currentQuestion.options.map((opt, idx) => {
                let optClass = styles.option
                const isSelected = currentQuestion.type === 'single'
                  ? selectedAnswer === idx
                  : ((selectedAnswer as number[]) || []).includes(idx)

                if (isSelected) optClass += ` ${styles.optionSelected}`

                return (
                  <View
                    key={opt.label}
                    className={optClass}
                    onClick={() => currentQuestion.type === 'single'
                      ? handleSelectSingle(currentQuestion.id, idx)
                      : handleSelectMultiple(currentQuestion.id, idx)
                    }
                  >
                    <View className={`${styles.optionLabel} ${isSelected ? styles.optionLabelActive : ''}`}>
                      <Text>{opt.label}</Text>
                    </View>
                    <Text className={styles.optionText}>{opt.text}</Text>
                  </View>
                )
              })}
            </View>

            {isCorrect !== null && (
              <View className={`${styles.feedback} ${isCorrect ? styles.feedbackCorrect : styles.feedbackWrong}`}>
                <Text className={styles.feedbackText}>
                  {isCorrect ? STRINGS.QUIZ_FEEDBACK_CORRECT : STRINGS.QUIZ_FEEDBACK_WRONG}
                </Text>
                <Text className={styles.explanation}>{currentQuestion.explanation}</Text>
              </View>
            )}
          </View>

          <View className={styles.navRow}>
            <Button variant='secondary' size='md' onClick={handlePrev} disabled={currentIndex === 0}>
              {STRINGS.QUIZ_PREV}
            </Button>
            {currentIndex < questions.length - 1 ? (
              <Button variant='primary' size='md' onClick={handleNext}>
                {STRINGS.QUIZ_NEXT}
              </Button>
            ) : (
              <Button variant='gradient' size='md' onClick={handleSubmit}>
                {STRINGS.QUIZ_SUBMIT}
              </Button>
            )}
          </View>
        </ScrollView>
      </View>
    </AuthGuard>
  )
}