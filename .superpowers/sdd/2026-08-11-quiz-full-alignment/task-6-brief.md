# Task 6: 完成匿名分类首页与独立题目浏览

## Files
- Modify: `src/pages/quiz/index.tsx`, `index.module.scss`
- Create: `src/pages/quiz/questions.tsx`, `questions.module.scss`
- Modify: `src/app.config.ts`
- Modify: `src/constants/routes.ts` if needed
- Modify: `src/components/QuizCategoryList/index.tsx` only for explicit browse/practice actions
- Create: `src/pages/quiz/__tests__/index.test.tsx`
- Create: `src/pages/quiz/__tests__/questions.test.tsx`

## Requirements
1. TDD page behavior first with real components where practical; mock only `quizApi`, auth hook, and Taro navigation boundary.
2. Unauthenticated quiz index renders recursive category data and never redirects solely for opening index. It does not call stats/checkin.
3. Authenticated index loads category, stats, checkin independently. A stats failure must not hide categories.
4. Each async section has loading/error/retry/empty state; no silent catch.
5. Category interaction offers explicit “浏览题目” and “开始练习”; browse navigates to questions with encoded categoryId, practice to practice setup.
6. Questions page is protected after auth initialization, queries category_id/question_type/page/page_size, supports exact three question types and pagination.
7. Questions page displays only question_text/options/type. Never displays or derives correct answer/explanation and has no answer-submit controls.
8. Register `questions` in quiz subpackage.
9. Preserve existing visual system; targeted styles only, no redesign.
10. Use `quizApi` and Task 2 DTOs/adapters. No old service functions, local mock, `/submit`, `/progress`.
11. Run focused tests, full tests, project typecheck delta. Touched files zero diagnostics.
12. Commit only Task 6 files: `feat: add anonymous quiz catalog and question browser`.

## Report
Write task-6-report.md with RED/GREEN, anonymous/auth cases, answer isolation, full test/typecheck delta, commit, concerns.
