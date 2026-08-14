import Taro from '@tarojs/taro'
import type { QuizAnswer } from '../contracts/quiz'
import {
  addCalendarDays,
  answerFingerprint,
  canonicalAnswer,
  clearStoredAttemptKey,
  clearStoredExamId,
  clearStoredPendingExamAbandonId,
  clearStoredPracticeAttemptKeys,
  clearStoredPracticeSessionId,
  clearStoredQuizCache,
  createIdempotencyKey,
  formatCountdown,
  getStoredExamId,
  getStoredPendingExamAbandonId,
  getStoredPracticeSessionId,
  getOrCreateStoredAttemptKey,
  remainingSeconds,
  serverClockOffset,
  setStoredExamId,
  setStoredPendingExamAbandonId,
  setStoredPracticeSessionId,
  shanghaiDate,
} from './quizCore.ts'
import type { QuizKeyValueStorage } from './quizCore.ts'

const taroStorage: QuizKeyValueStorage = {
  get: key => Taro.getStorageSync(key),
  set: (key, value) => Taro.setStorageSync(key, value),
  remove: key => Taro.removeStorageSync(key),
  keys: () => Taro.getStorageInfoSync().keys,
}

export {
  addCalendarDays,
  answerFingerprint,
  canonicalAnswer,
  createIdempotencyKey,
  formatCountdown,
  remainingSeconds,
  serverClockOffset,
  shanghaiDate,
}

export function getOrCreateAttemptKey(sessionId: number, sessionQuestionId: number, answer: QuizAnswer): string {
  return getOrCreateStoredAttemptKey(taroStorage, sessionId, sessionQuestionId, answer)
}

export function clearAttemptKey(sessionId: number, sessionQuestionId: number): void {
  clearStoredAttemptKey(taroStorage, sessionId, sessionQuestionId)
}

export function clearPracticeAttemptKeys(sessionId: number): void {
  clearStoredPracticeAttemptKeys(taroStorage, sessionId)
}

export function clearQuizCache(): void {
  clearStoredQuizCache(taroStorage)
}

export function getCachedPracticeSessionId(): number | null {
  return getStoredPracticeSessionId(taroStorage)
}

export function cachePracticeSessionId(sessionId: number): void {
  setStoredPracticeSessionId(taroStorage, sessionId)
}

export function clearCachedPracticeSessionId(expected?: number): void {
  clearStoredPracticeSessionId(taroStorage, expected)
}

export function getCachedExamId(): number | null {
  return getStoredExamId(taroStorage)
}

export function cacheExamId(examId: number): void {
  setStoredExamId(taroStorage, examId)
}

export function clearCachedExamId(expected?: number): void {
  clearStoredExamId(taroStorage, expected)
}

export function getPendingExamAbandonId(): number | null {
  return getStoredPendingExamAbandonId(taroStorage)
}

export function cachePendingExamAbandonId(examId: number): void {
  setStoredPendingExamAbandonId(taroStorage, examId)
}

export function clearPendingExamAbandonId(expected?: number): void {
  clearStoredPendingExamAbandonId(taroStorage, expected)
}
