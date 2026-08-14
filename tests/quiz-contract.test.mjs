import assert from 'node:assert/strict'
import test from 'node:test'
import {
  QuizContractError,
  parseExamDetail,
  parsePracticeScopePreview,
  parsePracticeSession,
  parsePracticeSkip,
  parseQuizCategories,
  parseQuizLibraries,
  parseQuizLibrary,
  parseQuizStats,
  parseWrongBookPage,
} from '../src/contracts/quiz.ts'

const v2Question = {
  id: 301,
  category_id: null,
  library_id: 11,
  knowledge_point_id: 31,
  question_revision_id: 401,
  question_type: 'judge',
  question_text: 'TCP 是面向连接的协议。',
  options: { A: '正确', B: '错误' },
  session_question_id: 501,
  position: 1,
  category_path: [
    { id: 11, name: '网络工程师题库', kind: 'library' },
    { id: 21, name: '网络基础', kind: 'module' },
    { id: 31, name: 'TCP/IP', kind: 'knowledge_point' },
  ],
  answered: false,
  attempt_count: 0,
  latest_result: null,
}

function v2Session(overrides = {}) {
  return {
    id: 601,
    mode: 'full',
    category_id: null,
    library_id: 11,
    scope_type: 'knowledge_point',
    scope_id: 31,
    requested_count: 120,
    actual_count: 120,
    status: 'in_progress',
    started_at: '2026-08-13T00:00:00Z',
    completed_at: null,
    abandoned_at: null,
    expires_at: '2026-08-20T00:00:00Z',
    paused_at: null,
    pause_reason: null,
    answered_count: 0,
    remaining_count: 120,
    current_position: 1,
    created_new: true,
    resume_available: false,
    lock_version: 1,
    questions: [v2Question],
    ...overrides,
  }
}

test('category parser accepts the frozen recursive shape', () => {
  const result = parseQuizCategories([{ id: 1, name: '网络', parent_id: null, depth: 1, description: null, sort_order: 0, question_count: 10, children: [] }])
  assert.equal(result[0].question_count, 10)
})

test('strict parser rejects missing and extra response fields', () => {
  assert.throws(() => parseQuizCategories([{ id: 1 }]), QuizContractError)
  assert.throws(() => parseQuizCategories([{ id: 1, name: '网络', parent_id: null, depth: 1, description: null, sort_order: 0, question_count: 10, children: [], legacy: true }]), QuizContractError)
})

test('V2 library catalog and fixed hierarchy reject contract drift', () => {
  const summary = {
    id: 11,
    library_code: 'QL00000011',
    name: '网络工程师题库',
    description: '课程配套题库',
    cover_url: 'https://example.invalid/quiz.png',
    access_mode: 'course_entitlement',
    question_count: 120,
    module_count: 1,
  }
  assert.equal(parseQuizLibraries([summary])[0].library_code, 'QL00000011')
  const detail = parseQuizLibrary({
    ...summary,
    details: null,
    modules: [{
      id: 21,
      library_id: 11,
      name: '网络基础',
      description: null,
      sort_order: 1,
      question_count: 120,
      knowledge_points: [{
        id: 31,
        module_id: 21,
        name: 'TCP/IP',
        description: null,
        sort_order: 1,
        question_count: 120,
      }],
    }],
  })
  assert.equal(detail.modules[0].knowledge_points[0].question_count, 120)
  assert.throws(() => parseQuizLibraries([{ ...summary, entitlement_id: 9 }]), QuizContractError)
})

test('V2 scope preview preserves unfinished-session and large-scope semantics', () => {
  const preview = parsePracticeScopePreview({
    library_id: 11,
    scope_type: 'knowledge_point',
    scope_id: 31,
    mode: 'full',
    question_count: 120,
    estimated_minutes: 180,
    valid_days: 7,
    requires_large_scope_confirmation: true,
    unfinished_session_id: 601,
    unfinished_session_expires_at: '2026-08-20T00:00:00Z',
  })
  assert.equal(preview.requires_large_scope_confirmation, true)
  assert.equal(preview.unfinished_session_id, 601)
  assert.throws(() => parsePracticeScopePreview({ ...preview, valid_days: 30 }), QuizContractError)
})

test('V2 small-window session strictly parses pause and terminal states', () => {
  const active = parsePracticeSession(v2Session())
  assert.equal(active.actual_count, 120)
  assert.equal(active.questions.length, 1)
  assert.equal(active.questions[0].question_revision_id, 401)

  const paused = parsePracticeSession(v2Session({
    status: 'paused',
    paused_at: '2026-08-14T00:00:00Z',
    pause_reason: 'quiz_entitlement_inactive',
  }))
  assert.equal(paused.pause_reason, 'quiz_entitlement_inactive')
  assert.equal(parsePracticeSession(v2Session({ status: 'terminated' })).status, 'terminated')
  assert.throws(() => parsePracticeSession(v2Session({
    status: 'paused',
    pause_reason: 'payment_failed',
  })), QuizContractError)
})

test('skip response is parsed directly and cannot introduce a loose DTO', () => {
  const result = parsePracticeSkip({
    session_id: 601,
    session_question_id: 501,
    skip_count: 1,
    next_question: { ...v2Question, id: 302, session_question_id: 502, position: 2 },
  })
  assert.equal(result.next_question?.session_question_id, 502)
  assert.equal(parsePracticeSkip({
    session_id: 601,
    session_question_id: 501,
    skip_count: 1,
    next_question: null,
  }).next_question, null)
  assert.throws(() => parsePracticeSkip({
    session_id: 601,
    session_question_id: 501,
    skip_count: 2,
    next_question: null,
  }), QuizContractError)
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
  const base = {
    id: 1,
    category_id: null,
    library_id: 11,
    scope_type: 'knowledge_point',
    scope_id: 31,
    question_count: 10,
    duration_seconds: 3600,
    started_at: '2026-08-12T00:00:00Z',
    deadline_at: '2026-08-12T01:00:00Z',
  }
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
