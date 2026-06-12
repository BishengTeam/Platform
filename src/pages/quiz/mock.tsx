import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import { getQuizQuestions, addFavorite, removeFavorite, addWrongBook, removeWrongBook } from '@/services/dataService'
import type { QuizQuestion } from '@/types'
import styles from './mock.module.scss'

export default function QuizMockPage() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number | number[]>>({})
  const [showResult, setShowResult] = useState(false)
  const [remainingTime, setRemainingTime] = useState(60 * 60)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [wrongBook, setWrongBook] = useState<Set<string>>(new Set())

  useLoad((options) => {
    const categoryId = options?.categoryId
    const qs = getQuizQuestions(categoryId || undefined)
    setQuestions(qs)
  })

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (questions.length > 0 && !showResult) {
      timerRef.current = setInterval(() => {
        setRemainingTime(t => {
          if (t <= 1) {
            if (timerRef.current) clearInterval(timerRef.current)
            setShowResult(true)
            return 0
          }
          return t - 1
        })
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [questions.length, showResult])

  const currentQuestion = questions[currentIndex]
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : undefined

  const handleSelectSingle = useCallback((questionId: string, optIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: optIndex }))
  }, [])

  const handleSelectMultiple = useCallback((questionId: string, optIndex: number) => {
    setAnswers(prev => {
      const cur = (prev[questionId] as number[]) || []
      const next = cur.includes(optIndex) ? cur.filter(i => i !== optIndex) : [...cur, optIndex]
      return { ...prev, [questionId]: next }
    })
  }, [])

  const answeredCount = questions.filter(q => answers[q.id] !== undefined).length

  const correctCount = useMemo(() => {
    if (!showResult) return 0
    return questions.filter(q => {
      const ans = answers[q.id]
      if (ans === undefined) return false
      if (q.type === 'single') return ans === q.correctAnswer
      const correct = q.correctAnswer as number[]
      const selected = (ans as number[]) || []
      return correct.length === selected.length && correct.every(c => selected.includes(c))
    }).length
  }, [showResult, questions, answers])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1)
  }
  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(i => i + 1)
  }

  const handleToggleFavorite = useCallback((id: number) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        removeFavorite(id)
      } else {
        next.add(id)
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
        removeWrongBook(id)
      } else {
        next.add(id)
        addWrongBook(id)
      }
      return next
    })
  }, [])

  const handleSubmit = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setShowResult(true)
  }

  if (!questions.length) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.QUIZ_MOCK_EXAM} shouldShowBack />
          <View className={styles.emptyBody}>
            <Text>{STRINGS.QUIZ_NO_QUESTIONS}</Text>
          </View>
        </View>
      </AuthGuard>
    )
  }

  if (showResult) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.QUIZ_MOCK_EXAM} shouldShowBack />
          <View className={styles.resultBody}>
            <View className={styles.resultCard}>
              <Text className={styles.resultEmoji}>{correctCount >= questions.length * 0.6 ? '🎉' : '💪'}</Text>
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
                setRemainingTime(60 * 60)
              }}>
                {STRINGS.QUIZ_REDO}
              </Button>
            </View>
          </View>
        </View>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.QUIZ_MOCK_EXAM} shouldShowBack />
        <View className={styles.topBar}>
          <View className={styles.timer}>
            <Text className={styles.timerIcon}>⏱</Text>
            <Text className={styles.timerText}>{formatTime(remainingTime)}</Text>
          </View>
          <Text className={styles.progressText}>
            {answeredCount} / {questions.length} {STRINGS.QUIZ_ANSWERED}
          </Text>
        </View>

        <View className={styles.progressBar}>
          <View className={styles.progressFill} style={{ width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%` }} />
        </View>

        <ScrollView className={styles.body} scrollY>
          <View className={styles.questionCard}>
            <View className={styles.questionHeader}>
              <Text className={styles.questionIndex}>
                {currentIndex + 1}. {currentQuestion.type === 'single' ? STRINGS.QUIZ_TYPE_SINGLE : STRINGS.QUIZ_TYPE_MULTIPLE}
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
