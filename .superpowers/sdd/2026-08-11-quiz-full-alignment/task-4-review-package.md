ff0ed61 feat: add quiz adapters and error states
 src/features/quiz/__tests__/adapters.test.ts | 148 +++++++++++++++++++++++++++
 src/features/quiz/__tests__/errors.test.ts   |  63 ++++++++++++
 src/features/quiz/adapters.ts                |  36 +++++++
 src/features/quiz/errors.ts                  |  64 ++++++++++++
 4 files changed, 311 insertions(+)
diff --git a/src/features/quiz/__tests__/adapters.test.ts b/src/features/quiz/__tests__/adapters.test.ts
new file mode 100644
index 0000000..9be9620
--- /dev/null
+++ b/src/features/quiz/__tests__/adapters.test.ts
@@ -0,0 +1,148 @@
+// @vitest-environment node
+
+import { describe, expect, it } from 'vitest'
+
+import { formatQuizAnswer, toQuestionViewModel } from '../adapters'
+import type {
+  QuizCollectionItem,
+  QuizExamAbandonedDetail,
+  QuizExamInProgressDetail,
+  QuizPage,
+  QuizPublicQuestion,
+  QuizWrongBookItem,
+} from '@/types/quiz'
+
+const publicQuestion = {
+  id: 10,
+  category_id: 2,
+  question_type: 'single_choice',
+  question_text: 'Which option is correct?',
+  options: { A: 'First option', C: 'Third option' },
+} satisfies QuizPublicQuestion
+
+const wrongBook = {
+  id: 31,
+  question_id: publicQuestion.id,
+  status: 'active',
+  question: publicQuestion,
+  question_status: 'published',
+  usable_for_practice: true,
+  first_wrong_at: '2026-08-11T09:00:00Z',
+  latest_wrong_at: '2026-08-12T09:00:00Z',
+} satisfies QuizWrongBookItem
+
+const collection = {
+  id: 32,
+  question_id: publicQuestion.id,
+  question: publicQuestion,
+  question_status: 'published',
+  is_active: true,
+  collected_at: '2026-08-12T09:00:00Z',
+} satisfies QuizCollectionItem
+
+const inProgressExam = {
+  id: 40,
+  status: 'in_progress',
+  category_id: 2,
+  question_count: 10,
+  duration_seconds: 3600,
+  started_at: '2026-08-12T09:00:00Z',
+  deadline_at: '2026-08-12T10:00:00Z',
+  server_time: '2026-08-12T09:10:00Z',
+  questions: [{
+    ...publicQuestion,
+    exam_question_id: 41,
+    position: 1,
+    category_path: [{ id: 2, name: 'Rules' }],
+    user_answer: null,
+    answer_lock_version: null,
+  }],
+} satisfies QuizExamInProgressDetail
+
+const abandonedExam = {
+  id: 42,
+  status: 'abandoned',
+  category_id: 2,
+  question_count: 10,
+  duration_seconds: 3600,
+  started_at: '2026-08-12T09:00:00Z',
+  deadline_at: '2026-08-12T10:00:00Z',
+  abandoned_at: '2026-08-12T09:10:00Z',
+  questions: [{
+    ...publicQuestion,
+    exam_question_id: 43,
+    position: 1,
+    answered: false,
+  }],
+} satisfies QuizExamAbandonedDetail
+
+const publicQuestionPage = {
+  items: [publicQuestion],
+  total: 1,
+  page: 1,
+  page_size: 20,
+} satisfies QuizPage<QuizPublicQuestion>
+
+describe('formatQuizAnswer', () => {
+  it('keeps a single-choice answer unchanged', () => {
+    expect(formatQuizAnswer('B')).toBe('B')
+  })
+
+  it('sorts and deduplicates a multiple-choice answer without changing the input', () => {
+    const answer = ['C', 'A', 'C', 'B']
+
+    expect(formatQuizAnswer(answer)).toEqual(['A', 'B', 'C'])
+    expect(answer).toEqual(['C', 'A', 'C', 'B'])
+  })
+})
+
+describe('toQuestionViewModel', () => {
+  it.each([
+    ['single_choice', 'single_choice'],
+    ['multiple_choice', 'multiple_choice'],
+    ['judge', 'judge'],
+  ] as const)('preserves the %s question type', (questionType, expectedType) => {
+    const question = { ...publicQuestion, question_type: questionType } satisfies QuizPublicQuestion
+
+    expect(toQuestionViewModel(question)).toMatchObject({ type: expectedType })
+  })
+
+  it('creates a rendering option array without changing the public question', () => {
+    expect(toQuestionViewModel(publicQuestion)).toEqual({
+      id: 10,
+      categoryId: 2,
+      type: 'single_choice',
+      text: 'Which option is correct?',
+      options: [
+        { key: 'A', label: 'First option' },
+        { key: 'C', label: 'Third option' },
+      ],
+    })
+    expect(publicQuestion.options).toEqual({ A: 'First option', C: 'Third option' })
+  })
+})
+
+describe('answer isolation', () => {
+  it('serializes all public-question flows without grading fields', () => {
+    const publicFlows = {
+      publicQuestionPage,
+      wrongBook,
+      collection,
+      inProgressExam,
+      abandonedExam,
+    }
+
+    const renderedData = {
+      questionList: publicFlows.publicQuestionPage.items.map(toQuestionViewModel),
+      wrongBook: toQuestionViewModel(publicFlows.wrongBook.question),
+      collection: toQuestionViewModel(publicFlows.collection.question),
+      inProgressExam: publicFlows.inProgressExam.questions.map(toQuestionViewModel),
+      abandonedExam: publicFlows.abandonedExam.questions.map(toQuestionViewModel),
+    }
+
+    const serialized = JSON.stringify({ publicFlows, renderedData })
+
+    expect(serialized).not.toContain('correct_answer')
+    expect(serialized).not.toContain('explanation')
+  })
+})
diff --git a/src/features/quiz/__tests__/errors.test.ts b/src/features/quiz/__tests__/errors.test.ts
new file mode 100644
index 0000000..f62e32d
--- /dev/null
+++ b/src/features/quiz/__tests__/errors.test.ts
@@ -0,0 +1,63 @@
+// @vitest-environment node
+
+import { describe, expect, it } from 'vitest'
+
+import { toQuizErrorState } from '../errors'
+
+class ApiError extends Error {
+  readonly code: number
+  readonly statusCode: number
+
+  constructor(message: string, code: number, statusCode: number) {
+    super(message)
+    this.name = 'ApiError'
+    this.code = code
+    this.statusCode = statusCode
+  }
+}
+
+describe('toQuizErrorState', () => {
+  it.each([
+    [401, 'unauthorized'],
+    [403, 'forbidden'],
+    [404, 'not_found'],
+    [409, 'conflict'],
+    [422, 'validation'],
+    [429, 'rate_limited'],
+  ] as const)('maps ApiError status %i to %s while retaining its message', (statusCode, kind) => {
+    const state = toQuizErrorState(new ApiError('Request-specific detail', -1, statusCode))
+
+    expect(state.kind).toBe(kind)
+    if (state.kind !== 'unauthorized') expect(state.message).toBe('Request-specific detail')
+  })
+
+  it.each([
+    [401, 'unauthorized'],
+    [403, 'forbidden'],
+    [404, 'not_found'],
+    [409, 'conflict'],
+    [422, 'validation'],
+    [429, 'rate_limited'],
+  ] as const)('uses an ApiError code when status is unavailable: %i to %s', (code, kind) => {
+    expect(toQuizErrorState(new ApiError('Request-specific detail', code, 0)).kind).toBe(kind)
+  })
+
+  it('uses statusCode before code when the two values disagree', () => {
+    expect(toQuizErrorState(new ApiError('Conflict detail', 404, 409))).toEqual({
+      kind: 'conflict',
+      message: 'Conflict detail',
+    })
+  })
+
+  it('keeps a regular Error message in the network state', () => {
+    expect(toQuizErrorState(new Error('Connection refused'))).toEqual({
+      kind: 'network',
+      message: 'Connection refused',
+    })
+  })
+
+  it('uses a safe network message for unknown values and unmapped API errors', () => {
+    expect(toQuizErrorState(undefined)).toEqual({ kind: 'network', message: 'Network request failed' })
+    expect(toQuizErrorState(new ApiError('', 500, 500))).toEqual({ kind: 'network', message: 'Network request failed' })
+  })
+})
diff --git a/src/features/quiz/adapters.ts b/src/features/quiz/adapters.ts
new file mode 100644
index 0000000..23f738b
--- /dev/null
+++ b/src/features/quiz/adapters.ts
@@ -0,0 +1,36 @@
+import type { QuizAnswer, QuizOptionKey, QuizPublicQuestion, QuizQuestionType } from '@/types/quiz'
+
+const optionKeys: readonly QuizOptionKey[] = ['A', 'B', 'C', 'D']
+
+export interface QuizQuestionOptionViewModel {
+  key: QuizOptionKey
+  label: string
+}
+
+/** The display-only representation used by question rendering surfaces. */
+export interface QuizQuestionViewModel {
+  id: number
+  categoryId: number
+  type: QuizQuestionType
+  text: string
+  options: QuizQuestionOptionViewModel[]
+}
+
+export function formatQuizAnswer(answer: QuizAnswer): QuizAnswer {
+  if (typeof answer === 'string') return answer
+
+  return [...new Set(answer)].sort()
+}
+
+export function toQuestionViewModel(question: QuizPublicQuestion): QuizQuestionViewModel {
+  return {
+    id: question.id,
+    categoryId: question.category_id,
+    type: question.question_type,
+    text: question.question_text,
+    options: optionKeys.flatMap((key) => {
+      const label = question.options[key]
+      return label === undefined ? [] : [{ key, label }]
+    }),
+  }
+}
diff --git a/src/features/quiz/errors.ts b/src/features/quiz/errors.ts
new file mode 100644
index 0000000..5b3a3ce
--- /dev/null
+++ b/src/features/quiz/errors.ts
@@ -0,0 +1,64 @@
+export type QuizErrorState =
+  | { kind: 'unauthorized' }
+  | { kind: 'forbidden'; message: string }
+  | { kind: 'not_found'; message: string }
+  | { kind: 'conflict'; message: string }
+  | { kind: 'validation'; message: string }
+  | { kind: 'rate_limited'; message: string }
+  | { kind: 'network'; message: string }
+
+type QuizErrorKind = QuizErrorState['kind']
+
+interface ApiErrorShape {
+  code: number
+  statusCode: number
+  message: string
+}
+
+const safeNetworkMessage = 'Network request failed'
+
+function isApiError(error: unknown): error is ApiErrorShape {
+  return error instanceof Error
+    && 'code' in error
+    && typeof error.code === 'number'
+    && 'statusCode' in error
+    && typeof error.statusCode === 'number'
+}
+
+function errorKindForCode(code: number): QuizErrorKind | undefined {
+  switch (code) {
+    case 401:
+      return 'unauthorized'
+    case 403:
+      return 'forbidden'
+    case 404:
+      return 'not_found'
+    case 409:
+      return 'conflict'
+    case 422:
+      return 'validation'
+    case 429:
+      return 'rate_limited'
+    default:
+      return undefined
+  }
+}
+
+function withMessage(kind: Exclude<QuizErrorKind, 'unauthorized'>, message: string): QuizErrorState {
+  return { kind, message }
+}
+
+export function toQuizErrorState(error: unknown): QuizErrorState {
+  if (isApiError(error)) {
+    const kind = errorKindForCode(error.statusCode) ?? errorKindForCode(error.code)
+    if (kind === 'unauthorized') return { kind }
+    if (kind !== undefined) return withMessage(kind, error.message || safeNetworkMessage)
+    return withMessage('network', error.message || safeNetworkMessage)
+  }
+
+  if (error instanceof Error && error.message) {
+    return withMessage('network', error.message)
+  }
+
+  return withMessage('network', safeNetworkMessage)
+}

