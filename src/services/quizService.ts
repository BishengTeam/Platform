/** Quiz API client. All 28 user operations use the frozen 2026-08-14 contract. */

import { del, get, post, put } from '@/utils/request'
import {
  parseCheckinCalendar,
  parseCheckinStatus,
  parseCollectionMutation,
  parseCollectionPage,
  parseExamAction,
  parseExamAnswerSaved,
  parseExamDetail,
  parseExamListPage,
  parseNullableExam,
  parseNullablePracticeSession,
  parsePracticeAbandon,
  parsePracticeAnswerSaved,
  parsePracticeAttempt,
  parsePracticeHistoryPage,
  parsePracticeScopePreview,
  parsePracticeSkip,
  parsePracticeSession,
  parseQuizCategories,
  parseQuizLibraries,
  parseQuizLibrary,
  parseQuizQuestionPage,
  parseQuizStats,
  parseWrongBookPage,
} from '@/contracts/quiz'
import type {
  PageData,
  QuizAnswer,
  QuizCategoryNode,
  QuizCheckinDay,
  QuizCheckinStatus,
  QuizCollectionItem,
  QuizCollectionMutation,
  QuizExamAction,
  QuizExamAnswerSaved,
  QuizExamDetail,
  QuizExamListItem,
  QuizPracticeAbandonResult,
  QuizPracticeAnswerSaved,
  QuizPracticeAttemptResult,
  QuizPracticeHistoryItem,
  QuizPracticeMode,
  QuizPracticeScopePreview,
  QuizPracticeScopeType,
  QuizPracticeSkipResult,
  QuizPracticeSession,
  QuizLibraryCatalogDetail,
  QuizLibraryCatalogItem,
  QuizPublicQuestion,
  QuizQuestionType,
  QuizStats,
  QuizWrongBookItem,
} from '@/contracts/quiz'

const QUIZ_API = '/api/quiz'

export interface PageQuery {
  page?: number
  page_size?: number
}

export interface QuizQuestionQuery extends PageQuery {
  category_id?: number
  question_type?: QuizQuestionType
}

export interface PracticeHistoryQuery extends QuizQuestionQuery {
  is_correct?: boolean
  date_from?: string
  date_to?: string
}

function queryData(query: object): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) result[key] = value
  }
  return result
}

export async function listQuizCategories(): Promise<QuizCategoryNode[]> {
  const response = await get<unknown>('/api/quiz/categories')
  return parseQuizCategories(response.data)
}

export async function listQuizLibraries(): Promise<QuizLibraryCatalogItem[]> {
  const response = await get<unknown>('/api/quiz/libraries')
  return parseQuizLibraries(response.data)
}

export async function getQuizLibrary(libraryId: number): Promise<QuizLibraryCatalogDetail> {
  const response = await get<unknown>(`/api/quiz/libraries/${libraryId}`)
  return parseQuizLibrary(response.data)
}

export async function previewPracticeScope(input: {
  scope_type: QuizPracticeScopeType
  scope_id: number
  mode?: 'full' | 'wrong_only'
}): Promise<QuizPracticeScopePreview> {
  const response = await get<unknown>('/api/quiz/practice-scopes/preview', queryData(input))
  return parsePracticeScopePreview(response.data)
}

export async function listQuizQuestions(query: QuizQuestionQuery = {}): Promise<PageData<QuizPublicQuestion>> {
  const response = await get<unknown>('/api/quiz/questions', queryData(query))
  return parseQuizQuestionPage(response.data)
}

export async function createPracticeSession(input: {
  mode: QuizPracticeMode
  category_id?: number
  question_count?: number
  scope_type?: QuizPracticeScopeType
  scope_id?: number
  restart_existing?: boolean
  confirm_large_scope?: boolean
}): Promise<QuizPracticeSession> {
  const response = await post<unknown>('/api/quiz/practice-sessions', queryData(input))
  return parsePracticeSession(response.data)
}

export async function skipPracticeQuestion(sessionId: number, sessionQuestionId: number): Promise<QuizPracticeSkipResult> {
  const response = await post<unknown>(`/api/quiz/practice-sessions/${sessionId}/questions/${sessionQuestionId}/skip`)
  return parsePracticeSkip(response.data)
}

export async function getCurrentPracticeSession(): Promise<QuizPracticeSession | null> {
  const response = await get<unknown>('/api/quiz/practice-sessions/current')
  return parseNullablePracticeSession(response.data)
}

export async function getPracticeSession(sessionId: number): Promise<QuizPracticeSession> {
  const response = await get<unknown>(`/api/quiz/practice-sessions/${sessionId}`)
  return parsePracticeSession(response.data)
}

export async function submitPracticeAttempt(sessionId: number, input: {
  session_question_id: number
  idempotency_key: string
  user_answer: QuizAnswer
}): Promise<QuizPracticeAttemptResult> {
  const response = await post<unknown>(`/api/quiz/practice-sessions/${sessionId}/attempts`, queryData(input))
  return parsePracticeAttempt(response.data)
}

export async function savePracticeAnswer(sessionId: number, sessionQuestionId: number, input: {
  user_answer: QuizAnswer
  lock_version: number
}): Promise<QuizPracticeAnswerSaved> {
  const response = await put<unknown>(`/api/quiz/practice-sessions/${sessionId}/answers/${sessionQuestionId}`, queryData(input))
  return parsePracticeAnswerSaved(response.data)
}

export async function submitPracticeSession(sessionId: number): Promise<QuizPracticeSession> {
  const response = await post<unknown>(`/api/quiz/practice-sessions/${sessionId}/submit`)
  return parsePracticeSession(response.data)
}

export async function abandonPracticeSession(sessionId: number): Promise<QuizPracticeAbandonResult> {
  const response = await post<unknown>(`/api/quiz/practice-sessions/${sessionId}/abandon`)
  return parsePracticeAbandon(response.data)
}

export async function listPracticeHistory(query: PracticeHistoryQuery = {}): Promise<PageData<QuizPracticeHistoryItem>> {
  const response = await get<unknown>('/api/quiz/practice-history', queryData(query))
  return parsePracticeHistoryPage(response.data)
}

export async function listWrongBook(query: PageQuery = {}): Promise<PageData<QuizWrongBookItem>> {
  const response = await get<unknown>(`${QUIZ_API}/wrong-book`, queryData(query))
  return parseWrongBookPage(response.data)
}

export async function listQuizCollections(query: PageQuery = {}): Promise<PageData<QuizCollectionItem>> {
  const response = await get<unknown>('/api/quiz/collections', queryData(query))
  return parseCollectionPage(response.data)
}

export async function addQuizCollection(questionId: number): Promise<QuizCollectionMutation> {
  const response = await post<unknown>('/api/quiz/collections', { question_id: questionId })
  return parseCollectionMutation(response.data)
}

export async function removeQuizCollection(questionId: number): Promise<QuizCollectionMutation> {
  const response = await del<unknown>(`/api/quiz/collections/${questionId}`)
  return parseCollectionMutation(response.data)
}

export async function getQuizCheckinStatus(): Promise<QuizCheckinStatus> {
  const response = await get<unknown>(`${QUIZ_API}/checkin`)
  return parseCheckinStatus(response.data)
}

export async function getQuizCheckinCalendar(dateFrom: string, dateTo: string): Promise<QuizCheckinDay[]> {
  const response = await get<unknown>('/api/quiz/checkin/calendar', { date_from: dateFrom, date_to: dateTo })
  return parseCheckinCalendar(response.data)
}

export async function getQuizStats(): Promise<QuizStats> {
  const response = await get<unknown>('/api/quiz/stats')
  return parseQuizStats(response.data)
}

export async function createQuizExam(input: {
  question_count: number
  category_id?: number
  scope_type?: QuizPracticeScopeType
  scope_id?: number
}): Promise<QuizExamDetail> {
  const response = await post<unknown>('/api/quiz/exams', queryData(input))
  return parseExamDetail(response.data)
}

export async function getCurrentQuizExam(): Promise<QuizExamDetail | null> {
  const response = await get<unknown>('/api/quiz/exams/current')
  return parseNullableExam(response.data)
}

export async function listQuizExams(query: PageQuery = {}): Promise<PageData<QuizExamListItem>> {
  const response = await get<unknown>('/api/quiz/exams', queryData(query))
  return parseExamListPage(response.data)
}

export async function getQuizExam(examId: number): Promise<QuizExamDetail> {
  const response = await get<unknown>(`/api/quiz/exams/${examId}`)
  return parseExamDetail(response.data)
}

export async function saveQuizExamAnswer(examId: number, examQuestionId: number, input: {
  user_answer: QuizAnswer
  lock_version: number
}): Promise<QuizExamAnswerSaved> {
  const response = await put<unknown>(`/api/quiz/exams/${examId}/answers/${examQuestionId}`, queryData(input))
  return parseExamAnswerSaved(response.data)
}

export async function submitQuizExam(examId: number): Promise<QuizExamAction> {
  const response = await post<unknown>(`/api/quiz/exams/${examId}/submit`)
  return parseExamAction(response.data)
}

export async function abandonQuizExam(examId: number): Promise<QuizExamAction> {
  const response = await post<unknown>(`/api/quiz/exams/${examId}/abandon`)
  return parseExamAction(response.data)
}
