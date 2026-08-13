9adcc14 refactor: define strict quiz API contracts
 .../task-2-report.md                               |  48 +++
 package.json                                       |   1 +
 .../quiz/__tests__/quizTypes.contract.test.ts      | 349 ++++++++++++++++
 src/types/quiz.ts                                  | 439 +++++++++++++++++----
 tsconfig.quiz-types.json                           |   8 +
 5 files changed, 776 insertions(+), 69 deletions(-)
diff --git a/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-2-report.md b/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-2-report.md
new file mode 100644
index 0000000..2570400
--- /dev/null
+++ b/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-2-report.md
@@ -0,0 +1,48 @@
+# Task 2 Report: Strict Quiz API Contracts
+
+## Status
+
+Complete. `src/types/quiz.ts` now contains only snake_case, Backend-aligned user quiz contracts.
+
+## Files
+
+- `src/types/quiz.ts` — strict types for the quiz category, practice, wrong-book, collection, check-in, stats, and exam contracts.
+- `src/features/quiz/__tests__/quizTypes.contract.test.ts` — executable compile-time literals and negative contract checks.
+- `tsconfig.quiz-types.json` — isolated type gate input set.
+- `package.json` — `typecheck:quiz-types` script.
+
+The requested `.test-d.ts` name cannot host executable `satisfies` literals: TypeScript treats it as an ambient declaration file and rejects initializers. The `.test.ts` companion is therefore the focused executable contract test.
+
+## RED/GREEN
+
+RED command:
+
+```powershell
+$taskNode = Join-Path $PWD '.superpowers\\tools\\node'; $env:Path = "$taskNode;$env:Path"; & (Join-Path $taskNode 'npm.cmd') run typecheck:quiz-types
+```
+
+RED output: exited 1 with the expected missing exports from `@/types/quiz` (for example `QuizAnswer`, `QuizCategoryNode`, and `QuizExamDetail`) before implementation.
+
+GREEN command: the same focused `npm run typecheck:quiz-types` command.
+
+GREEN output: exited 0; `tsc --noEmit -p tsconfig.quiz-types.json` reported no diagnostics.
+
+## Project Typecheck Delta
+
+`npm run typecheck` still exits 1 with documented, unrelated legacy errors. It reports no diagnostics in `src/types/quiz.ts` or the new contract test. Legacy quiz pages and services now also report intentional migration errors because they still import the removed camelCase view-model types; later migration tasks own those consumers.
+
+## Commit
+
+`refactor: define strict quiz API contracts`
+
+## Self-review
+
+- Transcribed every field from the two approved Backend sources, preserving snake_case and response nullability.
+- Used only the Backend enum values, with `QuizExamDetail` discriminated by `status`.
+- Documented numeric constraints TypeScript cannot encode.
+- Confirmed public, wrong-book, collection, in-progress, and abandoned questions expose neither `correct_answer` nor `explanation`; practice results/history and settled exam results may expose them.
+- Confirmed no `any`, broad `unknown`, or index signatures were introduced.
+
+## Concerns
+
+The project-wide typecheck remains red until follow-up tasks migrate legacy pages/services to the new API DTOs. The focused type gate is green.
diff --git a/package.json b/package.json
index d963e92..945c932 100644
--- a/package.json
+++ b/package.json
@@ -24,20 +24,21 @@
     "dev:weapp": "npm run build:weapp -- --watch",
     "dev:swan": "npm run build:swan -- --watch",
     "dev:alipay": "npm run build:alipay -- --watch",
     "dev:tt": "npm run build:tt -- --watch",
     "dev:h5": "npm run build:h5 -- --watch",
     "dev:rn": "npm run build:rn -- --watch",
     "dev:qq": "npm run build:qq -- --watch",
     "dev:jd": "npm run build:jd -- --watch",
     "dev:harmony-hybrid": "npm run build:harmony-hybrid -- --watch",
     "typecheck": "tsc --noEmit -p tsconfig.json",
+    "typecheck:quiz-types": "tsc --noEmit -p tsconfig.quiz-types.json",
     "test": "vitest",
     "quality:quiz": "npm run typecheck && npm test -- --run && npm run build:weapp"
   },
   "browserslist": [
     "last 3 versions",
     "Android >= 4.1",
     "ios >= 8"
   ],
   "author": "",
   "dependencies": {
diff --git a/src/features/quiz/__tests__/quizTypes.contract.test.ts b/src/features/quiz/__tests__/quizTypes.contract.test.ts
new file mode 100644
index 0000000..422a3d4
--- /dev/null
+++ b/src/features/quiz/__tests__/quizTypes.contract.test.ts
@@ -0,0 +1,349 @@
+import type {
+  QuizAnswer,
+  QuizCategoryNode,
+  QuizCheckinCalendarQuery,
+  QuizCheckinDay,
+  QuizCheckinStatusResponse,
+  QuizCollectionCreate,
+  QuizCollectionItem,
+  QuizCollectionMutationResponse,
+  QuizExamAbandonedDetail,
+  QuizExamActionResponse,
+  QuizExamAnswerSave,
+  QuizExamAnswerSaved,
+  QuizExamCreate,
+  QuizExamDetail,
+  QuizExamInProgressDetail,
+  QuizExamListItem,
+  QuizExamListQuery,
+  QuizExamSettledDetail,
+  QuizPage,
+  QuizPracticeAbandonResponse,
+  QuizPracticeAttemptCreate,
+  QuizPracticeHistoryItem,
+  QuizPracticeHistoryQuery,
+  QuizPracticeSessionCreate,
+  QuizPracticeSessionResponse,
+  QuizPublicQuestion,
+  QuizQuestionListQuery,
+  QuizQuestionType,
+  QuizStatsResponse,
+  QuizWrongBookItem,
+  QuizWrongBookQuery,
+} from '@/types/quiz'
+
+const category = {
+  id: 1,
+  name: '法规',
+  parent_id: null,
+  depth: 1,
+  description: null,
+  sort_order: 0,
+  question_count: 12,
+  children: [],
+} satisfies QuizCategoryNode
+
+const question = {
+  id: 10,
+  category_id: 1,
+  question_type: 'single_choice',
+  question_text: '题目',
+  options: { A: '选项 A', B: '选项 B' },
+} satisfies QuizPublicQuestion
+
+const questionQuery = {
+  category_id: 1,
+  question_type: 'judge',
+  page: 1,
+  page_size: 20,
+} satisfies QuizQuestionListQuery
+
+const practiceCreate = {
+  mode: 'normal',
+  category_id: 1,
+  question_count: 10,
+} satisfies QuizPracticeSessionCreate
+
+const practiceSession = {
+  id: 4,
+  mode: 'normal',
+  category_id: 1,
+  requested_count: 10,
+  actual_count: 10,
+  status: 'in_progress',
+  started_at: '2026-08-11T09:00:00Z',
+  completed_at: null,
+  abandoned_at: null,
+  lock_version: 1,
+  questions: [{
+    ...question,
+    session_question_id: 41,
+    position: 1,
+    category_path: [{ id: 1, name: '法规' }],
+    answered: true,
+    attempt_count: 1,
+    latest_result: {
+      attempt_id: 99,
+      attempt_no: 1,
+      user_answer: 'A',
+      is_correct: true,
+      correct_answer: 'A',
+      explanation: '解析',
+      submitted_at: '2026-08-11T09:01:00Z',
+    },
+  }],
+} satisfies QuizPracticeSessionResponse
+
+const practiceAttempt = {
+  session_question_id: 41,
+  idempotency_key: 'abcdefgh',
+  user_answer: ['A', 'B'],
+} satisfies QuizPracticeAttemptCreate
+
+const practiceAbandon = {
+  session_id: 4,
+  status: 'abandoned',
+  abandoned_at: '2026-08-11T09:02:00Z',
+} satisfies QuizPracticeAbandonResponse
+
+const practiceHistoryQuery = {
+  category_id: 1,
+  question_type: 'multiple_choice',
+  is_correct: false,
+  date_from: '2026-08-01',
+  date_to: '2026-08-11',
+  page: 1,
+  page_size: 20,
+} satisfies QuizPracticeHistoryQuery
+
+const practiceHistory = {
+  attempt_id: 99,
+  session_id: 4,
+  session_question_id: 41,
+  question_id: 10,
+  category_path: [{ id: 1, name: '法规' }],
+  question_type: 'single_choice',
+  question_text: '题目',
+  options: { A: '选项 A', B: '选项 B' },
+  user_answer: 'A',
+  correct_answer: 'A',
+  explanation: '解析',
+  is_correct: true,
+  attempt_no: 1,
+  submitted_at: '2026-08-11T09:01:00Z',
+  current_question_status: 'published',
+} satisfies QuizPracticeHistoryItem
+
+const wrongBookQuery = { page: 1, page_size: 20 } satisfies QuizWrongBookQuery
+
+const wrongBook = {
+  id: 8,
+  question_id: 10,
+  status: 'active',
+  question,
+  question_status: 'published',
+  usable_for_practice: true,
+  first_wrong_at: '2026-08-10T09:00:00Z',
+  latest_wrong_at: '2026-08-11T09:00:00Z',
+} satisfies QuizWrongBookItem
+
+const collectionCreate = { question_id: 10 } satisfies QuizCollectionCreate
+const collectionItem = {
+  id: 9,
+  question_id: 10,
+  question,
+  question_status: 'published',
+  is_active: true,
+  collected_at: '2026-08-11T09:00:00Z',
+} satisfies QuizCollectionItem
+const collectionMutation = {
+  question_id: 10,
+  is_active: false,
+  updated_at: '2026-08-11T09:01:00Z',
+} satisfies QuizCollectionMutationResponse
+
+const checkinStatus = {
+  checkin_date: '2026-08-11',
+  checked_in: true,
+  questions_completed: 3,
+  consecutive_days: 5,
+} satisfies QuizCheckinStatusResponse
+const checkinCalendar = {
+  date_from: '2026-08-01',
+  date_to: '2026-08-11',
+} satisfies QuizCheckinCalendarQuery
+const checkinDay = {
+  checkin_date: '2026-08-11',
+  questions_completed: 3,
+  consecutive_days: 5,
+} satisfies QuizCheckinDay
+
+const stats = {
+  practice: {
+    total_attempts: 8,
+    first_attempts: 7,
+    first_correct_attempts: 5,
+    accuracy: 71.43,
+    answered_questions: 7,
+    active_wrong_count: 2,
+    active_collection_count: 3,
+    checkin_days: 5,
+    consecutive_days: 5,
+    today_questions: 3,
+  },
+  exam: {
+    completed_exam_count: 1,
+    timed_out_exam_count: 0,
+    total_questions: 10,
+    correct_count: 8,
+    wrong_count: 1,
+    unanswered_count: 1,
+    average_score: 80,
+    highest_score: 80,
+    latest_score: 80,
+  },
+} satisfies QuizStatsResponse
+
+const examCreate = { category_id: 1, question_count: 10 } satisfies QuizExamCreate
+const examListQuery = { page: 1, page_size: 20 } satisfies QuizExamListQuery
+const examListItem = {
+  id: 7,
+  category_id: 1,
+  question_count: 10,
+  duration_seconds: 3600,
+  status: 'in_progress',
+  started_at: '2026-08-11T09:00:00Z',
+  deadline_at: '2026-08-11T10:00:00Z',
+  finished_at: null,
+  score: null,
+} satisfies QuizExamListItem
+
+const inProgressExam = {
+  id: 7,
+  status: 'in_progress',
+  category_id: 1,
+  question_count: 10,
+  duration_seconds: 3600,
+  started_at: '2026-08-11T09:00:00Z',
+  deadline_at: '2026-08-11T10:00:00Z',
+  server_time: '2026-08-11T09:10:00Z',
+  questions: [{
+    ...question,
+    exam_question_id: 71,
+    position: 1,
+    category_path: [{ id: 1, name: '法规' }],
+    user_answer: null,
+    answer_lock_version: null,
+  }],
+} satisfies QuizExamInProgressDetail
+
+const abandonedExam = {
+  id: 7,
+  status: 'abandoned',
+  category_id: 1,
+  question_count: 10,
+  duration_seconds: 3600,
+  started_at: '2026-08-11T09:00:00Z',
+  deadline_at: '2026-08-11T10:00:00Z',
+  abandoned_at: '2026-08-11T09:10:00Z',
+  questions: [{ ...question, exam_question_id: 71, position: 1, answered: false }],
+} satisfies QuizExamAbandonedDetail
+
+const settledExam = {
+  id: 7,
+  status: 'completed',
+  category_id: 1,
+  question_count: 10,
+  duration_seconds: 3600,
+  started_at: '2026-08-11T09:00:00Z',
+  deadline_at: '2026-08-11T10:00:00Z',
+  finished_at: '2026-08-11T09:40:00Z',
+  correct_count: 8,
+  wrong_count: 1,
+  unanswered_count: 1,
+  score: 80,
+  questions: [{
+    ...question,
+    exam_question_id: 71,
+    position: 1,
+    user_answer: 'A',
+    correct_answer: 'A',
+    explanation: '解析',
+    is_correct: true,
+  }],
+} satisfies QuizExamSettledDetail
+
+const examDetail: QuizExamDetail = settledExam
+const savedAnswer = { user_answer: 'A', lock_version: 0 } satisfies QuizExamAnswerSave
+const answerSaved = {
+  exam_id: 7,
+  exam_question_id: 71,
+  user_answer: 'A',
+  lock_version: 1,
+  saved_at: '2026-08-11T09:10:00Z',
+} satisfies QuizExamAnswerSaved
+const actionResult = {
+  exam_id: 7,
+  status: 'completed',
+  finished_at: '2026-08-11T09:40:00Z',
+  score: 80,
+} satisfies QuizExamActionResponse
+const questionPage = {
+  items: [question],
+  total: 1,
+  page: 1,
+  page_size: 20,
+} satisfies QuizPage<QuizPublicQuestion>
+
+// The change caught here is expanding the Backend question-type enum without updating clients.
+// @ts-expect-error Backend only exposes single_choice, multiple_choice, and judge.
+const unsupportedQuestionType: QuizQuestionType = 'essay'
+
+// The change caught here is accepting values other than a string or string array for answers.
+// @ts-expect-error QuizAnswer must not accept numeric answers.
+const invalidAnswer: QuizAnswer = 1
+
+// The change caught here is leaking grading data before an exam is settled.
+const inProgressQuestionLeak = {
+  ...question,
+  exam_question_id: 71,
+  position: 1,
+  category_path: [{ id: 1, name: '法规' }],
+  user_answer: null,
+  answer_lock_version: null,
+  // @ts-expect-error In-progress questions must not expose the correct answer.
+  correct_answer: 'A',
+} satisfies QuizExamInProgressDetail['questions'][number]
+
+void [
+  category,
+  questionQuery,
+  practiceCreate,
+  practiceSession,
+  practiceAttempt,
+  practiceAbandon,
+  practiceHistoryQuery,
+  practiceHistory,
+  wrongBookQuery,
+  wrongBook,
+  collectionCreate,
+  collectionItem,
+  collectionMutation,
+  checkinStatus,
+  checkinCalendar,
+  checkinDay,
+  stats,
+  examCreate,
+  examListQuery,
+  examListItem,
+  inProgressExam,
+  abandonedExam,
+  examDetail,
+  savedAnswer,
+  answerSaved,
+  actionResult,
+  questionPage,
+  unsupportedQuestionType,
+  invalidAnswer,
+  inProgressQuestionLeak,
+]
diff --git a/src/types/quiz.ts b/src/types/quiz.ts
index 5996dd5..7d9eb32 100644
--- a/src/types/quiz.ts
+++ b/src/types/quiz.ts
@@ -1,78 +1,379 @@
-export interface QuizCategory {
-  id: string
+/** Exact user-facing quiz API contracts. All DTO keys mirror Backend JSON. */
+
+export type QuizQuestionType = 'single_choice' | 'multiple_choice' | 'judge'
+export type QuizAnswer = string | string[]
+export type QuizOptionKey = 'A' | 'B' | 'C' | 'D'
+export type QuizOptions = Partial<Record<QuizOptionKey, string>>
+export type QuizDate = string
+export type QuizDateTime = string
+export type QuizDecimal = number
+
+export type QuizQuestionStatus = 'draft' | 'published' | 'disabled'
+export type QuizPracticeMode = 'normal' | 'wrong'
+export type QuizPracticeSessionStatus = 'in_progress' | 'completed' | 'abandoned'
+export type QuizWrongStatus = 'active' | 'cleared'
+export type QuizExamStatus = 'in_progress' | 'completed' | 'timed_out' | 'abandoned'
+
+/** Generic pagination envelope returned by list endpoints. */
+export interface QuizPage<T> {
+  items: T[]
+  /** Greater than or equal to 0. */
+  total: number
+  /** Greater than or equal to 1. */
+  page: number
+  /** Between 1 and 100. */
+  page_size: number
+}
+
+export interface QuizCategoryNode {
+  id: number
   name: string
-  questionCount: number
-  icon: string
-  parentId?: string
-  children?: QuizCategory[]
+  parent_id: number | null
+  /** Between 1 and 3. */
+  depth: number
+  description: string | null
+  sort_order: number
+  /** Greater than or equal to 1. */
+  question_count: number
+  children: QuizCategoryNode[]
+}
+
+export interface QuizCategoryPathItem {
+  id: number
+  name: string
+}
+
+/** A question whose answer and explanation are intentionally withheld. */
+export interface QuizPublicQuestion {
+  id: number
+  category_id: number
+  question_type: QuizQuestionType
+  question_text: string
+  options: QuizOptions
+}
+
+export interface QuizQuestionListQuery {
+  /** Greater than or equal to 1 when supplied. */
+  category_id?: number
+  question_type?: QuizQuestionType
+  /** Defaults to 1; greater than or equal to 1. */
+  page?: number
+  /** Defaults to 20; between 1 and 100. */
+  page_size?: number
 }
 
-export interface QuizOption {
-  label: string
-  text: string
+export interface QuizPracticeSessionCreate {
+  mode?: QuizPracticeMode
+  /** Required by Backend when mode is normal; forbidden when mode is wrong. */
+  category_id?: number
+  /** Required by Backend when mode is normal; between 10 and 100 when supplied. */
+  question_count?: number
 }
 
-export interface QuizQuestion {
-  id: string
-  categoryId: string
-  stem: string
-  options: QuizOption[]
-  /** C 端答题列表不返回正确答案，仅答题提交后由 QuizSubmitResponse 返回 */
-  correctAnswer: number | number[]
-  type: 'single' | 'multiple'
+export interface QuizPracticeAttemptResult {
+  attempt_id: number
+  /** Greater than or equal to 1. */
+  attempt_no: number
+  user_answer: QuizAnswer
+  is_correct: boolean
+  correct_answer: QuizAnswer
   explanation: string
+  submitted_at: QuizDateTime
+}
+
+export interface QuizPracticeQuestionState extends QuizPublicQuestion {
+  session_question_id: number
+  /** Greater than or equal to 1. */
+  position: number
+  category_path: QuizCategoryPathItem[]
+  answered: boolean
+  /** Greater than or equal to 0. */
+  attempt_count: number
+  latest_result: QuizPracticeAttemptResult | null
+}
+
+export interface QuizPracticeSessionResponse {
+  id: number
+  mode: QuizPracticeMode
+  category_id: number | null
+  requested_count: number
+  /** Between 1 and 100. */
+  actual_count: number
+  status: QuizPracticeSessionStatus
+  started_at: QuizDateTime
+  completed_at: QuizDateTime | null
+  abandoned_at: QuizDateTime | null
+  /** Greater than or equal to 1. */
+  lock_version: number
+  questions: QuizPracticeQuestionState[]
+}
+
+export interface QuizPracticeAttemptCreate {
+  /** Greater than or equal to 1. */
+  session_question_id: number
+  /** Between 8 and 64 characters. */
+  idempotency_key: string
+  user_answer: QuizAnswer
 }
 
-/** 签到日历单日记录，对齐后端 QuizCheckinResponse */
-export interface CheckinRecord {
-  /** 签到记录 ID，当天未签到时为 null */
-  id: number | null
-  /** 签到日期 YYYY-MM-DD */
-  checkinDate: string
-  /** 当天是否已签到 */
-  checkedIn: boolean
-  /** 当天完成题数 */
-  questionsCompleted: number
-  /** 连续签到天数 */
-  consecutiveDays: number
-}
-
-/** 签到状态（今日），对齐后端 GET /api/quiz/checkin */
-export type CheckinStatus = CheckinRecord
-
-export interface WrongQuestion {
-  id: string
-  /** 后端答题记录 ID，用于 DELETE /api/quiz/wrong-book/{id} */
-  recordId: number
-  categoryId: string
-  stem: string
-  options: QuizOption[]
-  correctAnswer: number | number[]
-  type: 'single' | 'multiple'
+export interface QuizPracticeAbandonResponse {
+  session_id: number
+  status: 'abandoned'
+  abandoned_at: QuizDateTime
+}
+
+export interface QuizPracticeHistoryQuery {
+  /** Greater than or equal to 1 when supplied. */
+  category_id?: number
+  question_type?: QuizQuestionType
+  is_correct?: boolean
+  date_from?: QuizDate
+  date_to?: QuizDate
+  /** Defaults to 1; greater than or equal to 1. */
+  page?: number
+  /** Defaults to 20; between 1 and 100. */
+  page_size?: number
+}
+
+/** Practice history is one of the few question views that may reveal the answer. */
+export interface QuizPracticeHistoryItem {
+  attempt_id: number
+  session_id: number
+  session_question_id: number
+  question_id: number
+  category_path: QuizCategoryPathItem[]
+  question_type: QuizQuestionType
+  question_text: string
+  options: QuizOptions
+  user_answer: QuizAnswer
+  correct_answer: QuizAnswer
   explanation: string
-  wrongDate: string
-  wrongCount: number
-}
-
-export interface QuizPracticeState {
-  questions: QuizQuestion[]
-  currentIndex: number
-  answers: Record<string, number | number[]>
-  mode: 'practice' | 'mock' | 'challenge' | 'assessment'
-}
-
-/** 题库练习统计，对齐后端 QuizStatsResponse (GET /api/quiz/stats) */
-export interface QuizStats {
-  totalAnswers: number
-  correctAnswers: number
-  accuracy: number
-  totalQuestions: number
-  answeredQuestions: number
-  completionRate: number
-  streakDays: number
-  totalCheckinDays: number
-  wrongCount: number
-  collectedCount: number
-  todayAnswers: number
-  todayCorrect: number
-}
\ No newline at end of file
+  is_correct: boolean
+  /** Greater than or equal to 1. */
+  attempt_no: number
+  submitted_at: QuizDateTime
+  current_question_status: QuizQuestionStatus | null
+}
+
+export interface QuizWrongBookQuery {
+  /** Defaults to 1; greater than or equal to 1. */
+  page?: number
+  /** Defaults to 20; between 1 and 100. */
+  page_size?: number
+}
+
+export interface QuizWrongBookItem {
+  id: number
+  question_id: number
+  status: QuizWrongStatus
+  question: QuizPublicQuestion
+  question_status: QuizQuestionStatus
+  usable_for_practice: boolean
+  first_wrong_at: QuizDateTime
+  latest_wrong_at: QuizDateTime
+}
+
+export interface QuizCollectionCreate {
+  /** Greater than or equal to 1. */
+  question_id: number
+}
+
+export interface QuizCollectionItem {
+  id: number
+  question_id: number
+  question: QuizPublicQuestion
+  question_status: QuizQuestionStatus
+  is_active: boolean
+  collected_at: QuizDateTime
+}
+
+export interface QuizCollectionMutationResponse {
+  question_id: number
+  is_active: boolean
+  updated_at: QuizDateTime
+}
+
+export interface QuizCheckinStatusResponse {
+  checkin_date: QuizDate
+  checked_in: boolean
+  /** Greater than or equal to 0. */
+  questions_completed: number
+  /** Greater than or equal to 0. */
+  consecutive_days: number
+}
+
+export interface QuizCheckinCalendarQuery {
+  date_from: QuizDate
+  /** Cannot be more than 366 days after date_from. */
+  date_to: QuizDate
+}
+
+export interface QuizCheckinDay {
+  checkin_date: QuizDate
+  /** Greater than or equal to 1. */
+  questions_completed: number
+  /** Greater than or equal to 1. */
+  consecutive_days: number
+}
+
+export interface QuizPracticeStats {
+  total_attempts: number
+  first_attempts: number
+  first_correct_attempts: number
+  /** Between 0 and 100. */
+  accuracy: QuizDecimal
+  answered_questions: number
+  active_wrong_count: number
+  active_collection_count: number
+  checkin_days: number
+  consecutive_days: number
+  today_questions: number
+}
+
+export interface QuizExamStats {
+  completed_exam_count: number
+  timed_out_exam_count: number
+  total_questions: number
+  correct_count: number
+  wrong_count: number
+  unanswered_count: number
+  /** Between 0 and 100 when present. */
+  average_score: QuizDecimal | null
+  /** Between 0 and 100 when present. */
+  highest_score: QuizDecimal | null
+  /** Between 0 and 100 when present. */
+  latest_score: QuizDecimal | null
+}
+
+export interface QuizStatsResponse {
+  practice: QuizPracticeStats
+  exam: QuizExamStats
+}
+
+export interface QuizExamCreate {
+  /** Greater than or equal to 1. */
+  category_id: number
+  /** Between 10 and 100. */
+  question_count: number
+}
+
+export interface QuizExamListQuery {
+  /** Defaults to 1; greater than or equal to 1. */
+  page?: number
+  /** Defaults to 20; between 1 and 100. */
+  page_size?: number
+}
+
+export interface QuizExamListItem {
+  id: number
+  category_id: number
+  /** Between 10 and 100. */
+  question_count: number
+  duration_seconds: 3600
+  status: QuizExamStatus
+  started_at: QuizDateTime
+  deadline_at: QuizDateTime
+  finished_at: QuizDateTime | null
+  /** Between 0 and 100 when present. */
+  score: QuizDecimal | null
+}
+
+export interface QuizExamQuestionState extends QuizPublicQuestion {
+  exam_question_id: number
+  /** Greater than or equal to 1. */
+  position: number
+  category_path: QuizCategoryPathItem[]
+  user_answer: QuizAnswer | null
+  /** Greater than or equal to 1 when present. */
+  answer_lock_version: number | null
+}
+
+export interface QuizExamInProgressDetail {
+  id: number
+  status: 'in_progress'
+  category_id: number
+  /** Between 10 and 100. */
+  question_count: number
+  duration_seconds: 3600
+  started_at: QuizDateTime
+  deadline_at: QuizDateTime
+  server_time: QuizDateTime
+  questions: QuizExamQuestionState[]
+}
+
+export interface QuizExamAbandonedQuestion extends QuizPublicQuestion {
+  exam_question_id: number
+  /** Greater than or equal to 1. */
+  position: number
+  answered: boolean
+}
+
+export interface QuizExamAbandonedDetail {
+  id: number
+  status: 'abandoned'
+  category_id: number
+  /** Between 10 and 100. */
+  question_count: number
+  duration_seconds: 3600
+  started_at: QuizDateTime
+  deadline_at: QuizDateTime
+  abandoned_at: QuizDateTime
+  questions: QuizExamAbandonedQuestion[]
+}
+
+/** Settled exam questions are the only exam question view that reveals grading data. */
+export interface QuizExamQuestionResult extends QuizPublicQuestion {
+  exam_question_id: number
+  /** Greater than or equal to 1. */
+  position: number
+  user_answer: QuizAnswer | null
+  correct_answer: QuizAnswer
+  explanation: string
+  is_correct: boolean
+}
+
+export interface QuizExamSettledDetail {
+  id: number
+  status: 'completed' | 'timed_out'
+  category_id: number
+  /** Between 10 and 100. */
+  question_count: number
+  duration_seconds: 3600
+  started_at: QuizDateTime
+  deadline_at: QuizDateTime
+  finished_at: QuizDateTime
+  correct_count: number
+  wrong_count: number
+  unanswered_count: number
+  /** Between 0 and 100, to one decimal place. */
+  score: QuizDecimal
+  questions: QuizExamQuestionResult[]
+}
+
+export type QuizExamDetail =
+  | QuizExamInProgressDetail
+  | QuizExamAbandonedDetail
+  | QuizExamSettledDetail
+
+export interface QuizExamAnswerSave {
+  user_answer: QuizAnswer
+  /** Greater than or equal to 0. */
+  lock_version: number
+}
+
+export interface QuizExamAnswerSaved {
+  exam_id: number
+  exam_question_id: number
+  user_answer: QuizAnswer
+  /** Greater than or equal to 1. */
+  lock_version: number
+  saved_at: QuizDateTime
+}
+
+export interface QuizExamActionResponse {
+  exam_id: number
+  status: QuizExamStatus
+  finished_at: QuizDateTime
+  /** Between 0 and 100 when present. */
+  score: QuizDecimal | null
+}
diff --git a/tsconfig.quiz-types.json b/tsconfig.quiz-types.json
new file mode 100644
index 0000000..f2802dd
--- /dev/null
+++ b/tsconfig.quiz-types.json
@@ -0,0 +1,8 @@
+{
+  "extends": "./tsconfig.json",
+  "include": [
+    "src/types/quiz.ts",
+    "src/features/quiz/__tests__/quizTypes.contract.test.ts"
+  ],
+  "exclude": ["node_modules"]
+}

