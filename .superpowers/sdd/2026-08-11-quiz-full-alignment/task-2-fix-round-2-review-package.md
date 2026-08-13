de4aa9d fix: allow default wrong practice count
 .superpowers/sdd/2026-08-11-quiz-full-alignment/task-2-report.md | 7 +++++++
 src/features/quiz/__tests__/quizTypes.contract.test.ts           | 5 +++++
 src/types/quiz.ts                                                | 4 ++--
 3 files changed, 14 insertions(+), 2 deletions(-)
diff --git a/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-2-report.md b/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-2-report.md
index 129b54b..9d0d470 100644
--- a/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-2-report.md
+++ b/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-2-report.md
@@ -46,10 +46,17 @@ GREEN output: exited 0; `tsc --noEmit -p tsconfig.quiz-types.json` reported no d
 ## Concerns
 
 The project-wide typecheck remains red until follow-up tasks migrate legacy pages/services to the new API DTOs. The focused type gate is green.
 
 ## Fix round 1: practice-create union
 
 - RED: after adding the new `@ts-expect-error` literals, `npm run typecheck:quiz-types` exited 1 with three unused directives, proving `{}`, incomplete normal input, and wrong-mode `category_id` were accepted.
 - GREEN: `QuizPracticeSessionCreate` is now a discriminated union. Normal/default input requires `category_id` and `question_count`; wrong input requires `question_count` and declares `category_id?: never`.
 - Focused gate: `npm run typecheck:quiz-types` exits 0.
 - Project delta: `npm run typecheck` remains red only with existing legacy diagnostics; its output contains no diagnostic from `src/types/quiz.ts` or `quizTypes.contract.test.ts`.
+
+## Fix round 2: wrong-mode default count
+
+- RED: adding `{ mode: 'wrong' } satisfies QuizPracticeSessionCreate` caused `npm run typecheck:quiz-types` to exit 1 because `question_count` was incorrectly required.
+- GREEN: wrong-mode `question_count` is optional (Backend defaults/forces it to 20); `category_id?: never` remains enforced and the supplied 10–100 bound is documented.
+- Focused gate: `npm run typecheck:quiz-types` exits 0.
+- Project delta: project typecheck remains red only with existing legacy diagnostics; none originate in the touched type or contract-test files.
diff --git a/src/features/quiz/__tests__/quizTypes.contract.test.ts b/src/features/quiz/__tests__/quizTypes.contract.test.ts
index 1094d1d..7318fd3 100644
--- a/src/features/quiz/__tests__/quizTypes.contract.test.ts
+++ b/src/features/quiz/__tests__/quizTypes.contract.test.ts
@@ -62,20 +62,24 @@ const practiceCreate = {
   mode: 'normal',
   category_id: 1,
   question_count: 10,
 } satisfies QuizPracticeSessionCreate
 
 const wrongPracticeCreate = {
   mode: 'wrong',
   question_count: 20,
 } satisfies QuizPracticeSessionCreate
 
+const defaultWrongPracticeCreate = {
+  mode: 'wrong',
+} satisfies QuizPracticeSessionCreate
+
 // The change caught here is allowing a default/normal practice session without both required fields.
 // @ts-expect-error Normal practice requires category_id and question_count.
 const incompleteNormalPracticeCreate = { mode: 'normal' } satisfies QuizPracticeSessionCreate
 
 // The change caught here is allowing the default normal mode to omit required fields.
 // @ts-expect-error The default normal mode requires category_id and question_count.
 const emptyPracticeCreate = {} satisfies QuizPracticeSessionCreate
 
 // The change caught here is accepting a category for wrong-question practice.
 // @ts-expect-error Wrong practice forbids category_id.
@@ -330,20 +334,21 @@ const inProgressQuestionLeak = {
   answer_lock_version: null,
   // @ts-expect-error In-progress questions must not expose the correct answer.
   correct_answer: 'A',
 } satisfies QuizExamInProgressDetail['questions'][number]
 
 void [
   category,
   questionQuery,
   practiceCreate,
   wrongPracticeCreate,
+  defaultWrongPracticeCreate,
   incompleteNormalPracticeCreate,
   emptyPracticeCreate,
   wrongPracticeWithCategory,
   practiceSession,
   practiceAttempt,
   practiceAbandon,
   practiceHistoryQuery,
   practiceHistory,
   wrongBookQuery,
   wrongBook,
diff --git a/src/types/quiz.ts b/src/types/quiz.ts
index 08d3c84..6101bb7 100644
--- a/src/types/quiz.ts
+++ b/src/types/quiz.ts
@@ -68,22 +68,22 @@ export type QuizPracticeSessionCreate =
       mode?: 'normal'
       /** Greater than or equal to 1. */
       category_id: number
       /** Between 10 and 100. */
       question_count: number
     }
   | {
       mode: 'wrong'
       /** Wrong practice is not scoped to a category. */
       category_id?: never
-      /** Between 10 and 100. */
-      question_count: number
+      /** Defaults to 20; between 10 and 100 when supplied. */
+      question_count?: number
     }
 
 export interface QuizPracticeAttemptResult {
   attempt_id: number
   /** Greater than or equal to 1. */
   attempt_no: number
   user_answer: QuizAnswer
   is_correct: boolean
   correct_answer: QuizAnswer
   explanation: string

