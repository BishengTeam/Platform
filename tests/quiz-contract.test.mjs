import assert from 'node:assert/strict'
import test from 'node:test'
import {
  QuizContractError,
  parseExamDetail,
  parsePracticeSession,
  parseQuizCategories,
  parseQuizStats,
  parseWrongBookPage,
} from '../src/contracts/quiz.ts'

test('category parser accepts the frozen recursive shape', () => {
  const result = parseQuizCategories([{ id: 1, name: '网络', parent_id: null, depth: 1, description: null, sort_order: 0, question_count: 10, children: [] }])
  assert.equal(result[0].question_count, 10)
})

test('strict parser rejects missing and extra response fields', () => {
  assert.throws(() => parseQuizCategories([{ id: 1 }]), QuizContractError)
  assert.throws(() => parseQuizCategories([{ id: 1, name: '网络', parent_id: null, depth: 1, description: null, sort_order: 0, question_count: 10, children: [], legacy: true }]), QuizContractError)
})

test('stats parser converts Pydantic Decimal strings without accepting guesses', () => {
  const stats = parseQuizStats({
    practice: { total_attempts: 2, first_attempts: 1, first_correct_attempts: 1, accuracy: '100.0', answered_questions: 1, active_wrong_count: 0, active_collection_count: 0, checkin_days: 1, consecutive_days: 1, today_questions: 1 },
    exam: { completed_exam_count: 1, timed_out_exam_count: 0, total_questions: 10, correct_count: 8, wrong_count: 2, unanswered_count: 0, average_score: '80.0', highest_score: '80.0', latest_score: '80.0' },
  })
  assert.equal(stats.practice.accuracy, 100)
  assert.equal(stats.exam.latest_score, 80)
})

test('exam discriminator hides answers while in progress and requires results when settled', () => {
  const base = { id: 1, category_id: 2, question_count: 10, duration_seconds: 3600, started_at: '2026-08-12T00:00:00Z', deadline_at: '2026-08-12T01:00:00Z' }
  const inProgress = parseExamDetail({ ...base, status: 'in_progress', server_time: '2026-08-12T00:10:00Z', questions: [] })
  assert.equal(inProgress.status, 'in_progress')
  assert.throws(() => parseExamDetail({ ...base, status: 'in_progress', server_time: '2026-08-12T00:10:00Z', score: '90.0', questions: [] }), QuizContractError)
  assert.throws(() => parseExamDetail({ ...base, status: 'completed', finished_at: '2026-08-12T00:30:00Z', questions: [] }), QuizContractError)
})

test('practice parser rejects answer leakage outside a submitted result', () => {
  const session = {
    id: 1,
    mode: 'normal',
    category_id: 2,
    requested_count: 10,
    actual_count: 1,
    status: 'in_progress',
    started_at: '2026-08-12T00:00:00Z',
    completed_at: null,
    abandoned_at: null,
    lock_version: 1,
    questions: [{ id: 3, category_id: 2, question_type: 'single_choice', question_text: '题干', options: { A: '甲', B: '乙', C: '丙' }, session_question_id: 4, position: 1, category_path: [{ id: 2, name: '分类' }], answered: false, attempt_count: 0, latest_result: null }],
  }
  assert.equal(parsePracticeSession(session).questions[0].latest_result, null)
  session.questions[0].correct_answer = 'A'
  assert.throws(() => parsePracticeSession(session), QuizContractError)
})

test('wrong-book parser permits status markers but rejects answers and explanations', () => {
  const page = {
    items: [{ id: 1, question_id: 2, status: 'active', question: { id: 2, category_id: 3, question_type: 'judge', question_text: '题干', options: { A: '正确', B: '错误' } }, question_status: 'disabled', usable_for_practice: false, first_wrong_at: '2026-08-12T00:00:00Z', latest_wrong_at: '2026-08-12T00:01:00Z' }],
    total: 1,
    page: 1,
    page_size: 20,
  }
  assert.equal(parseWrongBookPage(page).items[0].question_status, 'disabled')
  page.items[0].question.explanation = '不应泄露'
  assert.throws(() => parseWrongBookPage(page), QuizContractError)
})
