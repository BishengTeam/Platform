import type { QuizAnswer } from '../contracts/quiz.ts'

export interface QuizKeyValueStorage {
  get(key: string): unknown
  set(key: string, value: unknown): void
  remove(key: string): void
  keys(): string[]
}

const PRACTICE_SESSION_ID_KEY = 'quiz_active_practice_id'
const EXAM_ID_KEY = 'quiz_active_exam_id'

export const QUIZ_CACHE_PREFIXES = [
  'quiz_attempt_pending:',
  PRACTICE_SESSION_ID_KEY,
  EXAM_ID_KEY,
] as const

const ATTEMPT_PREFIX = QUIZ_CACHE_PREFIXES[0]

export function canonicalAnswer(answer: QuizAnswer): QuizAnswer {
  if (typeof answer === 'string') return answer.trim().toUpperCase()
  return [...new Set(answer.map(item => item.trim().toUpperCase()))].sort()
}

export function answerFingerprint(answer: QuizAnswer): string {
  const normalized = canonicalAnswer(answer)
  return typeof normalized === 'string' ? normalized : normalized.join(',')
}

export function createIdempotencyKey(now = Date.now(), random = Math.random()): string {
  return `mp-${now.toString(36)}-${Math.floor(random * 0x100000000).toString(36).padStart(7, '0')}`
}

interface PendingAttempt { answer: string; key: string }

function pendingKey(sessionId: number, sessionQuestionId: number): string {
  return `${ATTEMPT_PREFIX}${sessionId}:${sessionQuestionId}`
}

function isPendingAttempt(value: unknown): value is PendingAttempt {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return typeof record.answer === 'string' && typeof record.key === 'string'
}

export function getOrCreateStoredAttemptKey(
  storage: QuizKeyValueStorage,
  sessionId: number,
  sessionQuestionId: number,
  answer: QuizAnswer,
  factory = createIdempotencyKey,
): string {
  const storageKey = pendingKey(sessionId, sessionQuestionId)
  const fingerprint = answerFingerprint(answer)
  const stored = storage.get(storageKey)
  if (isPendingAttempt(stored) && stored.answer === fingerprint) return stored.key
  const key = factory()
  storage.set(storageKey, { answer: fingerprint, key } satisfies PendingAttempt)
  return key
}

export function clearStoredAttemptKey(storage: QuizKeyValueStorage, sessionId: number, sessionQuestionId: number): void {
  storage.remove(pendingKey(sessionId, sessionQuestionId))
}

export function clearStoredPracticeAttemptKeys(storage: QuizKeyValueStorage, sessionId: number): void {
  const prefix = `${ATTEMPT_PREFIX}${sessionId}:`
  for (const key of storage.keys()) {
    if (key.startsWith(prefix)) storage.remove(key)
  }
}

export function clearStoredQuizCache(storage: QuizKeyValueStorage): void {
  for (const key of storage.keys()) {
    if (QUIZ_CACHE_PREFIXES.some(prefix => key.startsWith(prefix))) storage.remove(key)
  }
}

function storedPositiveInteger(storage: QuizKeyValueStorage, key: string): number | null {
  const value = storage.get(key)
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null
}

function setStoredPositiveInteger(storage: QuizKeyValueStorage, key: string, value: number): void {
  if (!Number.isInteger(value) || value < 1) throw new Error('题库缓存 ID 必须为正整数')
  storage.set(key, value)
}

function clearStoredInteger(storage: QuizKeyValueStorage, key: string, expected?: number): void {
  if (expected === undefined || storedPositiveInteger(storage, key) === expected) storage.remove(key)
}

export function getStoredPracticeSessionId(storage: QuizKeyValueStorage): number | null {
  return storedPositiveInteger(storage, PRACTICE_SESSION_ID_KEY)
}

export function setStoredPracticeSessionId(storage: QuizKeyValueStorage, sessionId: number): void {
  setStoredPositiveInteger(storage, PRACTICE_SESSION_ID_KEY, sessionId)
}

export function clearStoredPracticeSessionId(storage: QuizKeyValueStorage, expected?: number): void {
  clearStoredInteger(storage, PRACTICE_SESSION_ID_KEY, expected)
}

export function getStoredExamId(storage: QuizKeyValueStorage): number | null {
  return storedPositiveInteger(storage, EXAM_ID_KEY)
}

export function setStoredExamId(storage: QuizKeyValueStorage, examId: number): void {
  setStoredPositiveInteger(storage, EXAM_ID_KEY, examId)
}

export function clearStoredExamId(storage: QuizKeyValueStorage, expected?: number): void {
  clearStoredInteger(storage, EXAM_ID_KEY, expected)
}

export function serverClockOffset(serverTime: string, receivedAt = Date.now()): number {
  const parsed = Date.parse(serverTime)
  return Number.isFinite(parsed) ? parsed - receivedAt : 0
}

export function remainingSeconds(deadlineAt: string, clockOffset = 0, now = Date.now()): number {
  const deadline = Date.parse(deadlineAt)
  if (!Number.isFinite(deadline)) return 0
  return Math.max(0, Math.ceil((deadline - (now + clockOffset)) / 1000))
}

export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safe / 60)
  const rest = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export function shanghaiDate(timestamp = Date.now()): string {
  const local = new Date(timestamp + 8 * 60 * 60 * 1000)
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}-${String(local.getUTCDate()).padStart(2, '0')}`
}

export function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  const timestamp = Date.UTC(year, month - 1, day) + days * 86400000
  const shifted = new Date(timestamp)
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`
}
