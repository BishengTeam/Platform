/**
 * @note 题库服务：答题、错题本、收藏、打卡相关 API
 * @note USE_MOCK 开关控制 mock/API 双模切换
 */

import { quizCategories, quizQuestions, wrongBook, favoriteQuestions, checkinRecords } from '@/constants/mock'
import { get, post, del } from '@/utils/request'

const USE_MOCK = false

// ---- 答题 ----

export async function getQuizCategories() {
  if (USE_MOCK) return quizCategories
  const res = await get<any[]>(`/api/quiz/categories`)
  return res.data
}

export async function getQuizQuestions(categoryId?: string) {
  if (USE_MOCK) {
    if (categoryId) return quizQuestions.filter(q => q.categoryId === categoryId)
    return quizQuestions
  }
  const res = await get<any[]>(`/api/quiz/questions`, categoryId ? { category_id: categoryId } : undefined)
  return res.data
}

export async function getWrongBook() {
  if (USE_MOCK) return wrongBook
  const res = await get<any[]>(`/api/quiz/wrong-book`)
  return res.data
}

export async function getFavoriteQuestions() {
  if (USE_MOCK) return favoriteQuestions
  const res = await get<any[]>(`/api/quiz/collections`)
  return res.data
}

export async function getCheckinRecords(): Promise<{ date: string; completed: boolean }[]> {
  if (USE_MOCK) return checkinRecords
  const res = await get<{ checkin_date: string; checked_in: boolean }>(`/api/quiz/checkin`)
  const data = res.data
  if (!data) return []
  return [{ date: data.checkin_date, completed: data.checked_in }]
}

// ---- 题库提交 ----

/** POST /api/quiz/submit — 提交单题答案 */
export async function submitQuizAnswer(data: {
  question_id: string
  answer: number | number[]
  is_correct: boolean
}): Promise<void> {
  if (USE_MOCK) return
  await post('/api/quiz/submit', data as unknown as Record<string, unknown>)
}

// ---- 错题本写操作 ----

/** POST /api/quiz/wrong-book — 加入错题本 */
export async function addWrongBook(questionId: number): Promise<void> {
  if (USE_MOCK) return
  await post('/api/quiz/wrong-book', { question_id: questionId })
}

/** DELETE /api/quiz/wrong-book/{id} — 移出错题本 */
export async function removeWrongBook(id: number): Promise<void> {
  if (USE_MOCK) return
  await del(`/api/quiz/wrong-book/${id}`)
}
