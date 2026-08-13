5a65a3a feat: add anonymous quiz catalog and question browser
 .../task-6-report.md                               |  80 +++++++++
 src/app.config.ts                                  |   4 +-
 src/components/QuizCategoryList/index.module.scss  |   6 +
 src/components/QuizCategoryList/index.tsx          |  44 +++--
 src/constants/routes.ts                            |   1 +
 src/pages/quiz/__tests__/index.test.tsx            | 187 +++++++++++++++++++
 src/pages/quiz/__tests__/questions.test.tsx        | 150 ++++++++++++++++
 src/pages/quiz/index.module.scss                   |   4 +-
 src/pages/quiz/index.tsx                           | 197 ++++++++++-----------
 src/pages/quiz/questions.module.scss               |  12 ++
 src/pages/quiz/questions.tsx                       |  80 +++++++++
 11 files changed, 631 insertions(+), 134 deletions(-)
diff --git a/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-6-report.md b/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-6-report.md
new file mode 100644
index 0000000..88a810a
--- /dev/null
+++ b/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-6-report.md
@@ -0,0 +1,80 @@
+# Task 6 report: anonymous quiz catalog and question browser
+
+## Status
+
+DONE_WITH_CONCERNS
+
+## Implementation
+
+- The quiz index is public and always loads the recursive category tree through `quizApi.listCategories()`.
+- Stats and check-in are requested only after auth initialization confirms an authenticated user. Category, stats, and check-in requests each own loading/error/retry state, so one failure does not hide or retry another section.
+- Category cards preserve the existing card/button visual language and expose distinct `浏览题目` and `开始练习` actions. Category IDs are URL encoded.
+- The new protected questions page waits for auth initialization, redirects unauthenticated visitors, and queries `category_id`, `question_type`, `page`, and `page_size` through `quizApi.listQuestions()`.
+- The browser supports exactly `single_choice`, `multiple_choice`, and `judge`. It maps `QuizPublicQuestion` through `toQuestionViewModel` and renders only the type, question text, and options. It contains no answer submission controls.
+- `questions` is registered in the quiz subpackage and route constants.
+
+## RED evidence
+
+Tests were written before implementation. The first focused run exited 1:
+
+```text
+Test Files 2 failed (2)
+Questions: failed to resolve ../questions because the page did not exist.
+Index: after the Taro host boundary was isolated, all 4 tests failed because the legacy getQuizCategories service function was still used.
+```
+
+The Taro runtime required test-boundary host shims for component primitives and compile-time runtime flags; application components remained real, while only `quizApi`, the auth hook, and Taro navigation/router boundaries were behavior doubles.
+
+## GREEN evidence
+
+Fresh focused run:
+
+```text
+Test Files 2 passed (2)
+Tests      8 passed (8)
+```
+
+Fresh full run:
+
+```text
+Test Files 8 passed (8)
+Tests      67 passed (67)
+```
+
+## Anonymous and authenticated cases
+
+- Anonymous/index: recursive parent and child categories render; stats/check-in are never called; no auth redirect occurs.
+- Authenticated/index: categories, stats, and check-in load independently. The test forces stats to fail while categories and check-in remain visible, then proves stats retry does not recall either other endpoint.
+- Questions: no query or redirect occurs before auth initialization. Once initialized unauthenticated, the page redirects without querying. Authenticated users receive the scoped browser.
+
+## Answer isolation
+
+The questions fixture deliberately injects `correct_answer` and `explanation` fields beyond the public DTO. The browser test verifies that neither the explanation nor a correct-answer label appears and that there is no submit-answer control. Production rendering first projects the response through `toQuestionViewModel`, whose shape excludes grading fields.
+
+## Typecheck delta
+
+The full strict project typecheck still exits 1 with 128 existing diagnostics across legacy application files. Filtering the compiler output against every touched TypeScript/TSX file reports:
+
+```text
+touched_diagnostics=0
+```
+
+`git diff --check` exits 0 for the Task 6 file set. A scoped search reports no legacy data service, local mock, `/submit`, or `/progress` reference in the two pages.
+
+## Commit
+
+Pending at report creation; filled in after the isolated Task 6 commit.
+
+## Self-review
+
+- Confirmed anonymous index access is not wrapped in `AuthGuard` and has no redirect side effect.
+- Confirmed protected requests are gated by both auth initialization and logged-in state.
+- Confirmed failure/retry handlers call only their own endpoint.
+- Confirmed recursive category rendering uses Task 2 DTO names and numeric IDs.
+- Confirmed question output is derived solely from the public view model.
+- Confirmed no unrelated existing staged or untracked file is included in the Task 6 scope.
+
+## Concerns
+
+- Project-wide typecheck remains red on existing diagnostics outside Task 6; touched files have zero diagnostics.
+- The tests use narrow host-element shims because Taro component packages require mini-program compile-time globals and NutUI canvas behavior that jsdom does not provide. Real page and application components are otherwise exercised.
diff --git a/src/app.config.ts b/src/app.config.ts
index 465c5a2..619440f 100644
--- a/src/app.config.ts
+++ b/src/app.config.ts
@@ -39,21 +39,21 @@ export default defineAppConfig({
     {
       root: 'pages/ai-consult',
       pages: ['index'],
     },
     {
       root: 'pages/course',
       pages: ['index', 'detail', 'content'],
     },
     {
       root: 'pages/quiz',
-      pages: ['index', 'practice', 'mock', 'wrong-book', 'collections', 'checkin'],
+      pages: ['index', 'questions', 'practice', 'mock', 'wrong-book', 'collections', 'checkin'],
     },
     {
       root: 'pages/mine',
       pages: ['courses', 'profile', 'personal-info', 'edit-profile', 'points', 'agreements', 'collections', 'exam-query', 'share', 'deactivate', 'exam-intention', 'contact-teachers'],
     },
     {
       root: 'pages/employment-zone',
       pages: ['index'],
     },
     {
@@ -71,11 +71,11 @@ export default defineAppConfig({
       pagePath: tab.key,
       text: tab.label,
       iconPath: `assets/icons/${tab.icon}.png`,
       selectedIconPath: `assets/icons/${tab.icon}-active.png`,
     })),
   },
   window: {
     navigationStyle: 'custom',
     backgroundColor: '#F0F5FF',
   },
-})
\ No newline at end of file
+})
diff --git a/src/components/QuizCategoryList/index.module.scss b/src/components/QuizCategoryList/index.module.scss
index bbad08d..925dcce 100644
--- a/src/components/QuizCategoryList/index.module.scss
+++ b/src/components/QuizCategoryList/index.module.scss
@@ -1,19 +1,23 @@
 @use '../../styles/variables' as *;
 
 .quizCategoryList {
   padding: 0 $spacing-lg;
   display: flex;
   flex-direction: column;
   gap: $spacing-sm;
 }
 
+.branch { display: flex; flex-direction: column; gap: $spacing-sm; }
+
+.children { display: flex; flex-direction: column; gap: $spacing-sm; margin-left: $spacing-md; padding-left: $spacing-sm; border-left: $border-thin solid $color-border; }
+
 .quizCategoryCard {
   display: flex;
   align-items: center;
   justify-content: space-between;
   padding: $spacing-md;
   background: $color-white;
   border-radius: $radius-md;
 }
 
 .quizCategoryInfo {
@@ -25,10 +29,12 @@
 .quizCategoryName {
   font-size: $font-base;
   font-weight: 600;
   color: $color-text;
 }
 
 .quizCategoryCount {
   font-size: $font-sm;
   color: $color-text-secondary;
 }
+
+.actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: $spacing-xs; }
diff --git a/src/components/QuizCategoryList/index.tsx b/src/components/QuizCategoryList/index.tsx
index 797f326..403a9a3 100644
--- a/src/components/QuizCategoryList/index.tsx
+++ b/src/components/QuizCategoryList/index.tsx
@@ -1,35 +1,33 @@
-import { View, Text } from '@tarojs/components'
+import { Text, View } from '@tarojs/components'
 import { Button } from '@/components/Button'
 import { STRINGS } from '@/constants/strings'
+import type { QuizCategoryNode } from '@/types/quiz'
 import styles from './index.module.scss'
 
-export interface QuizCategoryItem {
-  id: string
-  name: string
-  questionCount: number
-}
-
 interface QuizCategoryListProps {
-  categories: QuizCategoryItem[]
-  onCategoryClick: (categoryId: string) => void
+  categories: QuizCategoryNode[]
+  onBrowse: (categoryId: number) => void
+  onPractice: (categoryId: number) => void
 }
 
-export function QuizCategoryList({ categories, onCategoryClick }: QuizCategoryListProps) {
+function CategoryBranch({ category, onBrowse, onPractice }: { category: QuizCategoryNode } & Omit<QuizCategoryListProps, 'categories'>) {
   return (
-    <View className={styles.quizCategoryList}>
-      {categories.map(cat => (
-        <View key={cat.id} className={styles.quizCategoryCard}>
-          <View className={styles.quizCategoryInfo}>
-            <Text className={styles.quizCategoryName}>{cat.name}</Text>
-            <Text className={styles.quizCategoryCount}>
-              {cat.questionCount}{STRINGS.FORM_QUESTION_SUFFIX}
-            </Text>
-          </View>
-          <Button size='sm' variant='secondary' onClick={() => onCategoryClick(cat.id)}>
-            {STRINGS.QUIZ_START_PRACTICE}
-          </Button>
+    <View className={styles.branch} data-testid={`quiz-category-${category.id}`}>
+      <View className={styles.quizCategoryCard}>
+        <View className={styles.quizCategoryInfo}>
+          <Text className={styles.quizCategoryName}>{category.name}</Text>
+          <Text className={styles.quizCategoryCount}>{category.question_count}{STRINGS.FORM_QUESTION_SUFFIX}</Text>
+        </View>
+        <View className={styles.actions}>
+          <Button size='sm' variant='secondary' onClick={() => onBrowse(category.id)}>浏览题目</Button>
+          <Button size='sm' onClick={() => onPractice(category.id)}>{STRINGS.QUIZ_START_PRACTICE}</Button>
         </View>
-      ))}
+      </View>
+      {category.children.length > 0 && <View className={styles.children}>{category.children.map(child => <CategoryBranch key={child.id} category={child} onBrowse={onBrowse} onPractice={onPractice} />)}</View>}
     </View>
   )
 }
+
+export function QuizCategoryList(props: QuizCategoryListProps) {
+  return <View className={styles.quizCategoryList}>{props.categories.map(category => <CategoryBranch key={category.id} category={category} onBrowse={props.onBrowse} onPractice={props.onPractice} />)}</View>
+}
diff --git a/src/constants/routes.ts b/src/constants/routes.ts
index 9b0b5eb..7d46cf0 100644
--- a/src/constants/routes.ts
+++ b/src/constants/routes.ts
@@ -16,20 +16,21 @@ export const ROUTES = {
   REGISTRATION_FORM_RENSHE: 'pages/registration/form-renshe',
   REGISTRATION_XUEXIN_GUIDE: 'pages/registration/xuexin-guide',
   REGISTRATION_CONFIRM: 'pages/registration/confirm',
   PAYMENT_RESULT: 'pages/payment/result',
   ORDER_DETAIL: 'pages/order-detail/index',
   AI_CONSULT: 'pages/ai-consult/index',
   COURSE_INDEX: 'pages/course/index',
   COURSE_DETAIL: 'pages/course/detail',
   COURSE_CONTENT: 'pages/course/content',
   QUIZ_INDEX: 'pages/quiz/index',
+  QUIZ_QUESTIONS: 'pages/quiz/questions',
   QUIZ_PRACTICE: 'pages/quiz/practice',
   QUIZ_MOCK: 'pages/quiz/mock',
   QUIZ_WRONG_BOOK: 'pages/quiz/wrong-book',
   QUIZ_COLLECTIONS: 'pages/quiz/collections',
   QUIZ_CHECKIN: 'pages/quiz/checkin',
   MINE_COURSES: 'pages/mine/courses',
   MINE_PROFILE: 'pages/mine/profile',
   MINE_PERSONAL_INFO: 'pages/mine/personal-info',
   MINE_EDIT_PROFILE: 'pages/mine/edit-profile',
   MINE_POINTS: 'pages/mine/points',
diff --git a/src/pages/quiz/__tests__/index.test.tsx b/src/pages/quiz/__tests__/index.test.tsx
new file mode 100644
index 0000000..bd398ba
--- /dev/null
+++ b/src/pages/quiz/__tests__/index.test.tsx
@@ -0,0 +1,187 @@
+import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
+import QuizIndexPage from '../index'
+import { quizApi } from '@/services/quizService'
+import { useAuth } from '@/hooks/useAuth'
+import Taro from '@tarojs/taro'
+
+vi.hoisted(() => {
+  Object.assign(globalThis, {
+    ENABLE_ADJACENT_HTML: false,
+    ENABLE_CLONE_NODE: false,
+    ENABLE_CONTAINS: false,
+    ENABLE_INNER_HTML: false,
+    ENABLE_MUTATION_OBSERVER: false,
+    ENABLE_SIZE_APIS: false,
+    ENABLE_TEMPLATE_CONTENT: false,
+    PLATFORM_TYPE: 'test',
+    SUPPORT_TARO_POLYFILL: false,
+  })
+})
+
+vi.mock('@/services/quizService', () => ({
+  quizApi: {
+    listCategories: vi.fn(),
+    getStats: vi.fn(),
+    getCheckinStatus: vi.fn(),
+  },
+}))
+
+vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))
+
+vi.mock('@tarojs/components', () => ({
+  View: 'div',
+  Text: 'span',
+  Image: 'img',
+  Button: 'button',
+  ScrollView: 'div',
+}))
+
+vi.mock('@/components/Button', () => ({
+  Button: ({ children, onClick, disabled }: React.PropsWithChildren<{ onClick?: () => void; disabled?: boolean }>) => (
+    <button type='button' onClick={onClick} disabled={disabled}>{children}</button>
+  ),
+}))
+
+vi.mock('@tarojs/taro', () => ({
+  default: {
+    navigateTo: vi.fn(),
+    reLaunch: vi.fn(),
+  },
+  useDidShow: vi.fn(),
+}))
+
+const categories = [
+  {
+    id: 10,
+    name: '软件工程',
+    parent_id: null,
+    depth: 1,
+    description: '工程分类',
+    sort_order: 1,
+    question_count: 12,
+    children: [
+      {
+        id: 11,
+        name: '需求分析',
+        parent_id: 10,
+        depth: 2,
+        description: null,
+        sort_order: 1,
+        question_count: 5,
+        children: [],
+      },
+    ],
+  },
+]
+
+const stats = {
+  practice: {
+    total_attempts: 21,
+    first_attempts: 18,
+    first_correct_attempts: 15,
+    accuracy: 83.3,
+    answered_questions: 18,
+    active_wrong_count: 3,
+    active_collection_count: 4,
+    checkin_days: 6,
+    consecutive_days: 2,
+    today_questions: 7,
+  },
+  exam: {
+    completed_exam_count: 1,
+    timed_out_exam_count: 0,
+    total_questions: 10,
+    correct_count: 8,
+    wrong_count: 2,
+    unanswered_count: 0,
+    average_score: 80,
+    highest_score: 80,
+    latest_score: 80,
+  },
+}
+
+const checkin = {
+  checkin_date: '2026-08-12',
+  checked_in: true,
+  questions_completed: 7,
+  consecutive_days: 2,
+}
+
+describe('quiz catalog index', () => {
+  afterEach(cleanup)
+
+  beforeEach(() => {
+    vi.clearAllMocks()
+    vi.mocked(quizApi.listCategories).mockResolvedValue(categories)
+    vi.mocked(quizApi.getStats).mockResolvedValue(stats)
+    vi.mocked(quizApi.getCheckinStatus).mockResolvedValue(checkin)
+  })
+
+  it('renders recursive categories anonymously without loading protected data or redirecting', async () => {
+    vi.mocked(useAuth).mockReturnValue({ isChecked: true, isLoggedIn: false })
+
+    render(<QuizIndexPage />)
+
+    expect(await screen.findByText('软件工程')).toBeInTheDocument()
+    expect(screen.getByText('需求分析')).toBeInTheDocument()
+    expect(quizApi.getStats).not.toHaveBeenCalled()
+    expect(quizApi.getCheckinStatus).not.toHaveBeenCalled()
+    expect(Taro.reLaunch).not.toHaveBeenCalled()
+  })
+
+  it('offers separate browse and practice actions with encoded category navigation', async () => {
+    vi.mocked(useAuth).mockReturnValue({ isChecked: true, isLoggedIn: false })
+    render(<QuizIndexPage />)
+
+    const category = await screen.findByTestId('quiz-category-11')
+    fireEvent.click(within(category).getByRole('button', { name: '浏览题目' }))
+    expect(Taro.navigateTo).toHaveBeenLastCalledWith({
+      url: '/pages/quiz/questions?categoryId=11',
+    })
+
+    fireEvent.click(within(category).getByRole('button', { name: '开始练习' }))
+    expect(Taro.navigateTo).toHaveBeenLastCalledWith({
+      url: '/pages/quiz/practice?categoryId=11',
+    })
+  })
+
+  it('keeps categories and check-in visible when stats fail and retries stats independently', async () => {
+    vi.mocked(useAuth).mockReturnValue({ isChecked: true, isLoggedIn: true })
+    vi.mocked(quizApi.getStats)
+      .mockRejectedValueOnce(new Error('stats unavailable'))
+      .mockResolvedValueOnce(stats)
+
+    render(<QuizIndexPage />)
+
+    expect(await screen.findByText('软件工程')).toBeInTheDocument()
+    expect(await screen.findByText('已连续打卡 2 天')).toBeInTheDocument()
+    expect(await screen.findByText('统计数据加载失败')).toBeInTheDocument()
+
+    fireEvent.click(screen.getByRole('button', { name: '重试统计数据' }))
+
+    expect(await screen.findByText('83.3%')).toBeInTheDocument()
+    expect(quizApi.getStats).toHaveBeenCalledTimes(2)
+    expect(quizApi.listCategories).toHaveBeenCalledTimes(1)
+    expect(quizApi.getCheckinStatus).toHaveBeenCalledTimes(1)
+  })
+
+  it('exposes category loading, empty, error, and retry states', async () => {
+    vi.mocked(useAuth).mockReturnValue({ isChecked: false, isLoggedIn: false })
+    let rejectCategories: (reason: Error) => void = () => undefined
+    vi.mocked(quizApi.listCategories).mockImplementationOnce(() => new Promise((_, reject) => {
+      rejectCategories = reject
+    }))
+
+    render(<QuizIndexPage />)
+    expect(screen.getByText('题目分类加载中…')).toBeInTheDocument()
+
+    rejectCategories(new Error('category unavailable'))
+    expect(await screen.findByText('题目分类加载失败')).toBeInTheDocument()
+
+    vi.mocked(quizApi.listCategories).mockResolvedValueOnce([])
+    fireEvent.click(screen.getByRole('button', { name: '重试题目分类' }))
+
+    expect(await screen.findByText('暂无题目分类')).toBeInTheDocument()
+  })
+})
diff --git a/src/pages/quiz/__tests__/questions.test.tsx b/src/pages/quiz/__tests__/questions.test.tsx
new file mode 100644
index 0000000..31e492b
--- /dev/null
+++ b/src/pages/quiz/__tests__/questions.test.tsx
@@ -0,0 +1,150 @@
+import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
+import QuestionsPage from '../questions'
+import { quizApi } from '@/services/quizService'
+import { useAuth } from '@/hooks/useAuth'
+import Taro from '@tarojs/taro'
+
+vi.hoisted(() => {
+  Object.assign(globalThis, {
+    ENABLE_ADJACENT_HTML: false,
+    ENABLE_CLONE_NODE: false,
+    ENABLE_CONTAINS: false,
+    ENABLE_INNER_HTML: false,
+    ENABLE_MUTATION_OBSERVER: false,
+    ENABLE_SIZE_APIS: false,
+    ENABLE_TEMPLATE_CONTENT: false,
+    PLATFORM_TYPE: 'test',
+    SUPPORT_TARO_POLYFILL: false,
+  })
+})
+
+const routerParams: Record<string, string> = { categoryId: '7' }
+
+vi.mock('@/services/quizService', () => ({
+  quizApi: { listQuestions: vi.fn() },
+}))
+
+vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))
+
+vi.mock('@tarojs/components', () => ({
+  View: 'div',
+  Text: 'span',
+  Image: 'img',
+  Button: 'button',
+  ScrollView: ({ children }: React.PropsWithChildren<{ scrollY?: boolean }>) => <div>{children}</div>,
+}))
+
+vi.mock('@/components/Button', () => ({
+  Button: ({ children, onClick, disabled }: React.PropsWithChildren<{ onClick?: () => void; disabled?: boolean }>) => (
+    <button type='button' onClick={onClick} disabled={disabled}>{children}</button>
+  ),
+}))
+
+vi.mock('@tarojs/taro', () => ({
+  default: {
+    reLaunch: vi.fn(),
+    getCurrentInstance: () => ({ router: { params: routerParams } }),
+  },
+}))
+
+const questionPage = {
+  items: [
+    {
+      id: 99,
+      category_id: 7,
+      question_type: 'single_choice' as const,
+      question_text: 'Which boundary keeps answers private?',
+      options: { A: 'Public question DTO', B: 'Re…145 tokens truncated…  const { rerender } = render(<QuestionsPage />)
+
+    expect(quizApi.listQuestions).not.toHaveBeenCalled()
+    expect(Taro.reLaunch).not.toHaveBeenCalled()
+
+    vi.mocked(useAuth).mockReturnValue({ isChecked: true, isLoggedIn: false })
+    rerender(<QuestionsPage />)
+
+    await waitFor(() => expect(Taro.reLaunch).toHaveBeenCalledWith({ url: '/pages/auth/index' }))
+    expect(quizApi.listQuestions).not.toHaveBeenCalled()
+  })
+
+  it('queries the scoped page and renders only public question fields', async () => {
+    vi.mocked(useAuth).mockReturnValue({ isChecked: true, isLoggedIn: true })
+    render(<QuestionsPage />)
+
+    expect(await screen.findByText('Which boundary keeps answers private?')).toBeInTheDocument()
+    expect(screen.getByText('A. Public question DTO')).toBeInTheDocument()
+    expect(screen.getAllByText('单选题')).toHaveLength(2)
+    expect(quizApi.listQuestions).toHaveBeenCalledWith({
+      category_id: 7,
+      question_type: 'single_choice',
+      page: 1,
+      page_size: 20,
+    })
+    expect(screen.queryByText('This deliberately must not render.')).not.toBeInTheDocument()
+    expect(screen.queryByText('正确答案')).not.toBeInTheDocument()
+    expect(screen.queryByRole('button', { name: /提交答案/ })).not.toBeInTheDocument()
+  })
+
+  it('supports exactly three types and resets pagination when the type changes', async () => {
+    vi.mocked(useAuth).mockReturnValue({ isChecked: true, isLoggedIn: true })
+    render(<QuestionsPage />)
+    await screen.findByText('Which boundary keeps answers private?')
+
+    expect(screen.getAllByTestId('question-type-filter')).toHaveLength(3)
+    fireEvent.click(screen.getByRole('button', { name: '多选题' }))
+
+    await waitFor(() => expect(quizApi.listQuestions).toHaveBeenLastCalledWith({
+      category_id: 7,
+      question_type: 'multiple_choice',
+      page: 1,
+      page_size: 20,
+    }))
+  })
+
+  it('paginates and gives question failures an independent retry and empty state', async () => {
+    vi.mocked(useAuth).mockReturnValue({ isChecked: true, isLoggedIn: true })
+    vi.mocked(quizApi.listQuestions)
+      .mockRejectedValueOnce(new Error('questions unavailable'))
+      .mockResolvedValueOnce({ items: [], total: 0, page: 1, page_size: 20 })
+
+    render(<QuestionsPage />)
+    expect(await screen.findByText('题目加载失败')).toBeInTheDocument()
+
+    fireEvent.click(screen.getByRole('button', { name: '重试题目' }))
+    expect(await screen.findByText('暂无题目')).toBeInTheDocument()
+
+    vi.mocked(quizApi.listQuestions)
+      .mockResolvedValueOnce(questionPage)
+      .mockResolvedValueOnce({ ...questionPage, page: 2 })
+    fireEvent.click(screen.getByRole('button', { name: '多选题' }))
+    await screen.findByText('Which boundary keeps answers private?')
+    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
+    await waitFor(() => expect(quizApi.listQuestions).toHaveBeenLastCalledWith({
+      category_id: 7,
+      question_type: 'multiple_choice',
+      page: 2,
+      page_size: 20,
+    }))
+  })
+})
diff --git a/src/pages/quiz/index.module.scss b/src/pages/quiz/index.module.scss
index 1471205..d30a72c 100644
--- a/src/pages/quiz/index.module.scss
+++ b/src/pages/quiz/index.module.scss
@@ -145,11 +145,13 @@
 .statValue {
   font-size: $font-2xl;
   font-weight: 700;
   line-height: 1.2;
 }
 
 .statLabel {
   margin-top: $spacing-2xs;
   font-size: $font-2xs;
   color: $color-text-tertiary;
-}
\ No newline at end of file
+}
+
+.sectionState { display: flex; flex-direction: column; align-items: center; gap: $spacing-sm; margin: $spacing-md $spacing-lg; padding: $spacing-md; color: $color-text-secondary; background: $color-white; border-radius: $radius-md; }
diff --git a/src/pages/quiz/index.tsx b/src/pages/quiz/index.tsx
index 976c4ca..6324f1f 100644
--- a/src/pages/quiz/index.tsx
+++ b/src/pages/quiz/index.tsx
@@ -1,136 +1,117 @@
-import { useState, useEffect, useCallback } from 'react'
-import { View, Text } from '@tarojs/components'
-import Taro, { useDidShow } from '@tarojs/taro'
-import { AuthGuard } from '@/components/AuthGuard'
+import { useCallback, useEffect, useState } from 'react'
+import { Text, View } from '@tarojs/components'
+import Taro from '@tarojs/taro'
+import { Button } from '@/components/Button'
+import { CheckinBar } from '@/components/CheckinBar'
 import { PageHeader } from '@/components/PageHeader'
-import { QuizGrid } from '@/components/QuizGrid'
 import { QuizBottomNav } from '@/components/QuizBottomNav'
-import { CheckinBar } from '@/components/CheckinBar'
 import { QuizCategoryList } from '@/components/QuizCategoryList'
-import { STRINGS } from '@/constants/strings'
-import { QUIZ_GRID, QUIZ_BOTTOM } from '@/constants/quiz'
+import { QuizGrid } from '@/components/QuizGrid'
+import { QUIZ_BOTTOM, QUIZ_GRID } from '@/constants/quiz'
 import type { QuizBottomItem } from '@/constants/quiz'
-import type { QuizCategory, QuizStats } from '@/types/quiz'
-import { getQuizCategories, getCheckinStatus, getQuizStats } from '@/services/dataService'
+import { STRINGS } from '@/constants/strings'
+import { useAuth } from '@/hooks/useAuth'
+import { quizApi } from '@/services/quizService'
+import type { QuizCategoryNode, QuizStatsResponse } from '@/types/quiz'
 import styles from './index.module.scss'
 
-/** 统计卡片配置 */
-interface StatCard {
-  label: string
-  value: string
-  color: string
-}
-
-const STAT_CARD_COLORS = {
-  total:   '#1677FF',
-  accuracy: '#52C41A',
-  completion: '#722ED1',
-  wrong:   '#FF4D4F',
-  streak:  '#FA8C16',
-  today:   '#13C2C2',
-}
+type LoadState = 'loading' | 'ready' | 'empty' | 'error'
 
 export default function QuizIndexPage() {
-  const [categories, setCategories] = useState<QuizCategory[]>([])
+  const { isChecked, isLoggedIn } = useAuth()
+  const [categories, setCategories] = useState<QuizCategoryNode[]>([])
+  const [categoryState, setCategoryState] = useState<LoadState>('loading')
+  const [stats, setStats] = useState<QuizStatsResponse | null>(null)
+  const [statsState, setStatsState] = useState<LoadState>('loading')
   const [streakDays, setStreakDays] = useState(0)
-  const [stats, setStats] = useState<QuizStats | null>(null)
-  const [loading, setLoading] = useState(true)
+  const [checkinState, setCheckinState] = useState<LoadState>('loading')
 
-  // 首次加载：分类 + 签到状态 + 统计
-  useEffect(() => {
-    Promise.all([
-      getQuizCategories(),
-      getCheckinStatus(),
-      getQuizStats(),
-    ]).then(([cats, status, s]) => {
-      setCategories(cats)
-      setStreakDays(status?.consecutiveDays ?? 0)
-      setStats(s)
-    }).catch(() => {
-      // 加载失败时保持默认空状态
-    }).finally(() => {
-      setLoading(false)
-    })
+  const loadCategories = useCallback(async () => {
+    setCategoryState('loading')
+    try {
+      const result = await quizApi.listCategories()
+      setCategories(result)
+      setCategoryState(result.length ? 'ready' : 'empty')
+    } catch {
+      setCategoryState('error')
+    }
   }, [])
 
-  // 页面每次显示时刷新签到状态和统计（Taro navigateBack 不会重新 mount）
-  useDidShow(() => {
-    Promise.all([
-      getCheckinStatus(),
-      getQuizStats(),
-    ]).then(([status, s]) => {
-      setStreakDays(status?.consecutiveDays ?? 0)
-      setStats(s)
-    }).catch(() => {})
-  })
+  const loadStats = useCallback(async () => {
+    setStatsState('loading')
+    try {
+      setStats(await quizApi.getStats())
+      setStatsState('ready')
+    } catch {
+      setStatsState('error')
+    }
+  }, [])
 
-  const handleQuizGrid = useCallback((item: { mode: string }) => {
-    if (item.mode === 'mock') {
-      Taro.navigateTo({ url: `/pages/quiz/mock` })
-    } else {
-      Taro.navigateTo({ url: `/pages/quiz/practice?mode=${item.mode}` })
+  const loadCheckin = useCallback(async () => {
+    setCheckinState('loading')
+    try {
+      const status = await quizApi.getCheckinStatus()
+      setStreakDays(status.consecutive_days)
+      setCheckinState('ready')
+    } catch {
+      setCheckinState('error')
     }
   }, [])
 
-  const handleQuizCategory = useCallback((categoryId: string) => {
-    Taro.navigateTo({ url: `/pages/quiz/practice?categoryId=${categoryId}` })
+  useEffect(() => { void loadCategories() }, [loadCategories])
+
+  useEffect(() => {
+    if (!isChecked || !isLoggedIn) return
+    void loadStats()
+    void loadCheckin()
+  }, [isChecked, isLoggedIn, loadCheckin, loadStats])
+
+  const navigatePractice = useCallback((categoryId: number) => {
+    Taro.navigateTo({ url: `/pages/quiz/practice?categoryId=${encodeURIComponent(String(categoryId))}` })
   }, [])
 
-  const handleBottomNav = useCallback((item: QuizBottomItem) => {
-    Taro.navigateTo({ url: `/pages/${item.route}` })
+  const navigateBrowse = useCallback((categoryId: number) => {
+    Taro.navigateTo({ url: `/pages/quiz/questions?categoryId=${encodeURIComponent(String(categoryId))}` })
   }, [])
 
-  // 构建统计卡片数据
-  const statCards: StatCard[] = stats
-    ? [
-        { label: STRINGS.QUIZ_STATS_TOTAL,      value: String(stats.totalQuestions), color: STAT_CARD_COLORS.total },
-        { label: STRINGS.QUIZ_STATS_ACCURACY,    value: `${stats.accuracy}%`,         color: STAT_CARD_COLORS.accuracy },
-        { label: STRINGS.QUIZ_STATS_COMPLETION,  value: `${stats.completionRate}%`,   color: STAT_CARD_COLORS.completion },
-        { label: STRINGS.QUIZ_STATS_WRONG,       value: String(stats.wrongCount),     color: STAT_CARD_COLORS.wrong },
-        { label: STRINGS.QUIZ_CHECKIN_STREAK,    value: `${stats.streakDays}天`,      color: STAT_CARD_COLORS.streak },
-        { label: STRINGS.QUIZ_STATS_TODAY,       value: String(stats.todayAnswers),   color: STAT_CARD_COLORS.today },
-      ]
-    : []
+  const statCards = stats ? [
+    { label: '累计作答', value: String(stats.practice.total_attempts) },
+    { label: STRINGS.QUIZ_STATS_ACCURACY, value: `${stats.practice.accuracy}%` },
+    { label: STRINGS.QUIZ_STATS_WRONG, value: String(stats.practice.active_wrong_count) },
+    { label: STRINGS.QUIZ_STATS_TODAY, value: String(stats.practice.today_questions) },
+  ] : []
 
   return (
-    <AuthGuard>
-      <View className={styles.page}>
-        <PageHeader title={STRINGS.QUIZ_HEADER} shouldShowBack />
-        <View className={styles.body}>
-          <CheckinBar
-            streakDays={streakDays}
-            onCheckin={() => Taro.navigateTo({ url: `/pages/quiz/checkin` })}
-          />
+    <View className={styles.page}>
+      <PageHeader title={STRINGS.QUIZ_HEADER} shouldShowBack />
+      <View className={styles.body}>
+        {isChecked && isLoggedIn && (
+          <>
+            {checkinState === 'loading' && <Text className={styles.sectionState}>签到信息加载中…</Text>}
+            {checkinState === 'error' && <View className={styles.sectionState}><Text>签到信息加载失败</Text><Button size='sm' onClick={loadCheckin}>重试签到信息</Button></View>}
+            {checkinState === 'ready' && <CheckinBar streakDays={streakDays} onCheckin={() => Taro.navigateTo({ url: '/pages/quiz/checkin' })} />}
 
-          {/* 数据面板 */}
-          {!loading && statCards.length > 0 && (
-            <View className={styles.statsPanel}>
-              <View className={styles.statsGrid}>
-                {statCards.map((card) => (
-                  <View key={card.label} className={styles.statCard}>
-                    <Text className={styles.statValue} style={{ color: card.color }}>
-                      {card.value}
-                    </Text>
-                    <Text className={styles.statLabel}>{card.label}</Text>
-                  </View>
-                ))}
+            {statsState === 'loading' && <Text className={styles.sectionState}>统计数据加载中…</Text>}
+            {statsState === 'error' && <View className={styles.sectionState}><Text>统计数据加载失败</Text><Button size='sm' onClick={loadStats}>重试统计数据</Button></View>}
+            {statsState === 'ready' && statCards.length === 0 && <Text className={styles.sectionState}>暂无统计数据</Text>}
+            {statsState === 'ready' && statCards.length > 0 && (
+              <View className={styles.statsPanel}>
+                <View className={styles.statsGrid}>
+                  {statCards.map(card => <View key={card.label} className={styles.statCard}><Text className={styles.statValue}>{card.value}</Text><Text className={styles.statLabel}>{card.label}</Text></View>)}
+                </View>
               </View>
-            </View>
-          )}
+            )}
+            <QuizGrid items={QUIZ_GRID} onItemClick={(item) => Taro.navigateTo({ url: item.mode === 'mock' ? '/pages/quiz/mock' : `/pages/quiz/practice?mode=${item.mode}` })} />
+          </>
+        )}
 
-          {!loading && categories.length > 0 && (
-            <>
-              <QuizGrid items={QUIZ_GRID} onItemClick={handleQuizGrid} />
-              <QuizCategoryList
-                categories={categories}
-                onCategoryClick={handleQuizCategory}
-              />
-            </>
-          )}
+        {categoryState === 'loading' && <Text className={styles.sectionState}>题目分类加载中…</Text>}
+        {categoryState === 'error' && <View className={styles.sectionState}><Text>题目分类加载失败</Text><Button size='sm' onClick={loadCategories}>重试题目分类</Button></View>}
+        {categoryState === 'empty' && <Text className={styles.sectionState}>暂无题目分类</Text>}
+        {categoryState === 'ready' && <QuizCategoryList categories={categories} onBrowse={navigateBrowse} onPractice={navigatePractice} />}
 
-          <QuizBottomNav items={QUIZ_BOTTOM} onItemClick={handleBottomNav} />
-        </View>
+        {isChecked && isLoggedIn && <QuizBottomNav items={QUIZ_BOTTOM} onItemClick={(item: QuizBottomItem) => Taro.navigateTo({ url: `/pages/${item.route}` })} />}
       </View>
-    </AuthGuard>
+    </View>
   )
-}
\ No newline at end of file
+}
diff --git a/src/pages/quiz/questions.module.scss b/src/pages/quiz/questions.module.scss
new file mode 100644
index 0000000..4f8a4db
--- /dev/null
+++ b/src/pages/quiz/questions.module.scss
@@ -0,0 +1,12 @@
+@use '../../styles/variables' as *;
+
+.page { display: flex; flex-direction: column; height: 100vh; height: 100dvh; background: $color-bg; }
+.filters { display: flex; gap: $spacing-sm; padding: $spacing-md $spacing-lg; background: $color-white; }
+.body { flex: 1; box-sizing: border-box; padding: $spacing-md $spacing-lg calc(#{$spacing-lg} + #{$safe-bottom}); }
+.state { display: flex; flex-direction: column; align-items: center; gap: $spacing-sm; padding: $spacing-xl; color: $color-text-secondary; }
+.questionCard { display: flex; flex-direction: column; gap: $spacing-sm; margin-bottom: $spacing-md; padding: $spacing-md; background: $color-white; border-radius: $radius-md; box-shadow: $shadow-xs; }
+.questionType { align-self: flex-start; padding: $spacing-2xs $spacing-xs; color: $color-primary; background: $color-blue-tint; border-radius: $radius-sm; font-size: $font-sm; }
+.questionText { color: $color-text; font-size: $font-base; font-weight: 600; line-height: 1.5; }
+.options { display: flex; flex-direction: column; gap: $spacing-xs; }
+.option { color: $color-text-secondary; font-size: $font-sm; line-height: 1.5; }
+.pagination { display: flex; align-items: center; justify-content: center; gap: $spacing-md; padding: $spacing-md 0; color: $color-text-secondary; }
diff --git a/src/pages/quiz/questions.tsx b/src/pages/quiz/questions.tsx
new file mode 100644
index 0000000..f4930d5
--- /dev/null
+++ b/src/pages/quiz/questions.tsx
@@ -0,0 +1,80 @@
+import { useCallback, useEffect, useMemo, useState } from 'react'
+import { ScrollView, Text, View } from '@tarojs/components'
+import Taro from '@tarojs/taro'
+import { Button } from '@/components/Button'
+import { PageHeader } from '@/components/PageHeader'
+import { ROUTES } from '@/constants/routes'
+import { toQuestionViewModel } from '@/features/quiz/adapters'
+import { useAuth } from '@/hooks/useAuth'
+import { quizApi } from '@/services/quizService'
+import type { QuizPage, QuizPublicQuestion, QuizQuestionType } from '@/types/quiz'
+import styles from './questions.module.scss'
+
+const PAGE_SIZE = 20
+const TYPES: ReadonlyArray<{ value: QuizQuestionType; label: string }> = [
+  { value: 'single_choice', label: '单选题' },
+  { value: 'multiple_choice', label: '多选题' },
+  { value: 'judge', label: '判断题' },
+]
+
+const TYPE_LABELS: Record<QuizQuestionType, string> = { single_choice: '单选题', multiple_choice: '多选题', judge: '判断题' }
+
+export default function QuestionsPage() {
+  const { isChecked, isLoggedIn } = useAuth()
+  const categoryId = Number(Taro.getCurrentInstance().router?.params?.categoryId)
+  const [type, setType] = useState<QuizQuestionType>('single_choice')
+  const [page, setPage] = useState(1)
+  const [result, setResult] = useState<QuizPage<QuizPublicQuestion> | null>(null)
+  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
+  const [requestVersion, setRequestVersion] = useState(0)
+
+  useEffect(() => {
+    if (isChecked && !isLoggedIn) Taro.reLaunch({ url: `/${ROUTES.AUTH}` })
+  }, [isChecked, isLoggedIn])
+
+  const load = useCallback(async () => {
+    if (!isChecked || !isLoggedIn) return
+    setState('loading')
+    try {
+      const next = await quizApi.listQuestions({
+        ...(Number.isInteger(categoryId) && categoryId > 0 ? { category_id: categoryId } : {}),
+        question_type: type,
+        page,
+        page_size: PAGE_SIZE,
+      })
+      setResult(next)
+      setState(next.items.length ? 'ready' : 'empty')
+    } catch {
+      setState('error')
+    }
+  }, [categoryId, isChecked, isLoggedIn, page, type, requestVersion])
+
+  useEffect(() => { void load() }, [load])
+  const questions = useMemo(() => result?.items.map(toQuestionViewModel) ?? [], [result])
+
+  if (!isChecked || !isLoggedIn) return null
+
+  return (
+    <View className={styles.page}>
+      <PageHeader title='浏览题目' shouldShowBack />
+      <View className={styles.filters}>{TYPES.map(item => <Button key={item.value} variant={item.value === type ? 'primary' : 'secondary'} size='sm' onClick={() => { setType(item.value); setPage(1) }}><Text data-testid='question-type-filter'>{item.label}</Text></Button>)}</View>
+      <ScrollView className={styles.body} scrollY>
+        {state === 'loading' && <Text className={styles.state}>题目加载中…</Text>}
+        {state === 'error' && <View className={styles.state}><Text>题目加载失败</Text><Button size='sm' onClick={() => setRequestVersion(value => value + 1)}>重试题目</Button></View>}
+        {state === 'empty' && <Text className={styles.state}>暂无题目</Text>}
+        {state === 'ready' && questions.map(question => (
+          <View key={question.id} className={styles.questionCard}>
+            <Text className={styles.questionType}>{TYPE_LABELS[question.type]}</Text>
+            <Text className={styles.questionText}>{question.text}</Text>
+            <View className={styles.options}>{question.options.map(option => <Text key={option.key} className={styles.option}>{option.key}. {option.label}</Text>)}</View>
+          </View>
+        ))}
+        <View className={styles.pagination}>
+          <Button variant='secondary' size='sm' disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>上一页</Button>
+          <Text>第 {page} 页</Text>
+          <Button variant='secondary' size='sm' disabled={result ? page * result.page_size >= result.total : true} onClick={() => setPage(value => value + 1)}>下一页</Button>
+        </View>
+      </ScrollView>
+    </View>
+  )
+}

