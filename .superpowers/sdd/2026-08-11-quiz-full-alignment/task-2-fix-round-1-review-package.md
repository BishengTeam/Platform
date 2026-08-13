94f5241 fix: tighten quiz practice create contract
 .../task-2-report.md                               |  7 +++++++
 .../quiz/__tests__/quizTypes.contract.test.ts      | 21 ++++++++++++++++++++
 src/types/quiz.ts                                  | 23 +++++++++++++++-------
 3 files changed, 44 insertions(+), 7 deletions(-)
diff --git a/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-2-report.md b/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-2-report.md
index 2570400..129b54b 100644
--- a/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-2-report.md
+++ b/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-2-report.md
@@ -39,10 +39,17 @@ GREEN output: exited 0; `tsc --noEmit -p tsconfig.quiz-types.json` reported no d
 
 - Transcribed every field from the two approved Backend sources, preserving snake_case and response nullability.
 - Used only the Backend enum values, with `QuizExamDetail` discriminated by `status`.
 - Documented numeric constraints TypeScript cannot encode.
 - Confirmed public, wrong-book, collection, in-progress, and abandoned questions expose neither `correct_answer` nor `explanation`; practice results/history and settled exam results may expose them.
 - Confirmed no `any`, broad `unknown`, or index signatures were introduced.
 
 ## Concerns
 
 The project-wide typecheck remains red until follow-up tasks migrate legacy pages/services to the new API DTOs. The focused type gate is green.
+
+## Fix round 1: practice-create union
+
+- RED: after adding the new `@ts-expect-error` literals, `npm run typecheck:quiz-types` exited 1 with three unused directives, proving `{}`, incomplete normal input, and wrong-mode `category_id` were accepted.
+- GREEN: `QuizPracticeSessionCreate` is now a discriminated union. Normal/default input requires `category_id` and `question_count`; wrong input requires `question_count` and declares `category_id?: never`.
+- Focused gate: `npm run typecheck:quiz-types` exits 0.
+- Project delta: `npm run typecheck` remains red only with existing legacy diagnostics; its output contains no diagnostic from `src/types/quiz.ts` or `quizTypes.contract.test.ts`.
diff --git a/src/features/quiz/__tests__/quizTypes.contract.test.ts b/src/features/quiz/__tests__/quizTypes.contract.test.ts
index 422a3d4..1094d1d 100644
--- a/src/features/quiz/__tests__/quizTypes.contract.test.ts
+++ b/src/features/quiz/__tests__/quizTypes.contract.test.ts
@@ -57,20 +57,37 @@ const questionQuery = {
   page: 1,
   page_size: 20,
 } satisfies QuizQuestionListQuery
 
 const practiceCreate = {
   mode: 'normal',
   category_id: 1,
   question_count: 10,
 } satisfies QuizPracticeSessionCreate
 
+const wrongPracticeCreate = {
+  mode: 'wrong',
+  question_count: 20,
+} satisfies QuizPracticeSessionCreate
+
+// The change caught here is allowing a default/normal practice session without both required fields.
+// @ts-expect-error Normal practice requires category_id and question_count.
+const incompleteNormalPracticeCreate = { mode: 'normal' } satisfies QuizPracticeSessionCreate
+
+// The change caught here is allowing the default normal mode to omit required fields.
+// @ts-expect-error The default normal mode requires category_id and question_count.
+const emptyPracticeCreate = {} satisfies QuizPracticeSessionCreate
+
+// The change caught here is accepting a category for wrong-question practice.
+// @ts-expect-error Wrong practice forbids category_id.
+const wrongPracticeWithCategory = { mode: 'wrong', category_id: 1, question_count: 20 } satisfies QuizPracticeSessionCreate
+
 const practiceSession = {
   id: 4,
   mode: 'normal',
   category_id: 1,
   requested_count: 10,
   actual_count: 10,
   status: 'in_progress',
   started_at: '2026-08-11T09:00:00Z',
   completed_at: null,
   abandoned_at: null,
@@ -312,20 +329,24 @@ const inProgressQuestionLeak = {
   user_answer: null,
   answer_lock_version: null,
   // @ts-expect-error In-progress questions must not expose the correct answer.
   correct_answer: 'A',
 } satisfies QuizExamInProgressDetail['questions'][number]
 
 void [
   category,
   questionQuery,
   practiceCreate,
+  wrongPracticeCreate,
+  incompleteNormalPracticeCreate,
+  emptyPracticeCreate,
+  wrongPracticeWithCategory,
   practiceSession,
   practiceAttempt,
   practiceAbandon,
   practiceHistoryQuery,
   practiceHistory,
   wrongBookQuery,
   wrongBook,
   collectionCreate,
   collectionItem,
   collectionMutation,
diff --git a/src/types/quiz.ts b/src/types/quiz.ts
index 7d9eb32..08d3c84 100644
--- a/src/types/quiz.ts
+++ b/src/types/quiz.ts
@@ -55,27 +55,36 @@ export interface QuizPublicQuestion {
 export interface QuizQuestionListQuery {
   /** Greater than or equal to 1 when supplied. */
   category_id?: number
   question_type?: QuizQuestionType
   /** Defaults to 1; greater than or equal to 1. */
   page?: number
   /** Defaults to 20; between 1 and 100. */
   page_size?: number
 }
 
-export interface QuizPracticeSessionCreate {
-  mode?: QuizPracticeMode
-  /** Required by Backend when mode is normal; forbidden when mode is wrong. */
-  category_id?: number
-  /** Required by Backend when mode is normal; between 10 and 100 when supplied. */
-  question_count?: number
-}
+export type QuizPracticeSessionCreate =
+  | {
+      /** Defaults to normal when omitted. */
+      mode?: 'normal'
+      /** Greater than or equal to 1. */
+      category_id: number
+      /** Between 10 and 100. */
+      question_count: number
+    }
+  | {
+      mode: 'wrong'
+      /** Wrong practice is not scoped to a category. */
+      category_id?: never
+      /** Between 10 and 100. */
+      question_count: number
+    }
 
 export interface QuizPracticeAttemptResult {
   attempt_id: number
   /** Greater than or equal to 1. */
   attempt_no: number
   user_answer: QuizAnswer
   is_correct: boolean
   correct_answer: QuizAnswer
   explanation: string
   submitted_at: QuizDateTime

