425daa1 fix: add quiz stats and check-in empty states
 .../task-6-report.md                               | 35 ++++++++++++
 src/pages/quiz/__tests__/index.test.tsx            | 66 ++++++++++++++++++++++
 src/pages/quiz/index.tsx                           | 36 ++++++++++--
 3 files changed, 132 insertions(+), 5 deletions(-)
diff --git a/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-6-report.md b/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-6-report.md
index 88a810a..cc9984e 100644
--- a/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-6-report.md
+++ b/.superpowers/sdd/2026-08-11-quiz-full-alignment/task-6-report.md
@@ -71,10 +71,45 @@ Pending at report creation; filled in after the isolated Task 6 commit.
 - Confirmed protected requests are gated by both auth initialization and logged-in state.
 - Confirmed failure/retry handlers call only their own endpoint.
 - Confirmed recursive category rendering uses Task 2 DTO names and numeric IDs.
 - Confirmed question output is derived solely from the public view model.
 - Confirmed no unrelated existing staged or untracked file is included in the Task 6 scope.
 
 ## Concerns
 
 - Project-wide typecheck remains red on existing diagnostics outside Task 6; touched files have zero diagnostics.
 - The tests use narrow host-element shims because Taro component packages require mini-program compile-time globals and NutUI canvas behavior that jsdom does not provide. Real page and application components are otherwise exercised.
+
+## Fix round 1/5: authenticated empty states and check-in retry
+
+Status: DONE_WITH_CONCERNS.
+
+The review identified that successful stats and check-in objects were always classified as ready, making each section's declared `empty` state unreachable. The fix defines emptiness from valid DTO business content:
+
+- Stats are empty when every practice/exam activity counter is zero. Nullable score values do not manufacture activity.
+- Check-in is empty when `checked_in` is false and both `questions_completed` and `consecutive_days` are zero.
+
+These are normal typed DTO fixtures; no null casts or malformed responses are used. The distinct empty branches provide guidance to begin practicing, while loading and error branches remain unchanged.
+
+### RED evidence
+
+Two tests were added before production changes. The focused run exited 1 with 5 passing and 1 failing test. The all-zero fixture rendered the existing zero-filled stats panel and `已连续打卡 0 天` bar, so the expected empty guidance could not be found. The separate check-in failure/retry test already passed and established the existing isolation behavior.
+
+### GREEN evidence
+
+Fresh focused run:
+
+```text
+Test Files 1 passed (1)
+Tests      6 passed (6)
+```
+
+Fresh full run:
+
+```text
+Test Files 8 passed (8)
+Tests      69 passed (69)
+```
+
+The full project typecheck still reports the same 128 existing diagnostics; filtering against `src/pages/quiz/index.tsx` and its test reports `touched_diagnostics=0`.
+
+The new check-in test forces an initial failure, verifies stats and categories remain visible, retries check-in successfully, and verifies categories/stats were each called only once.
diff --git a/src/pages/quiz/__tests__/index.test.tsx b/src/pages/quiz/__tests__/index.test.tsx
index bd398ba..178b7ff 100644
--- a/src/pages/quiz/__tests__/index.test.tsx
+++ b/src/pages/quiz/__tests__/index.test.tsx
@@ -101,20 +101,53 @@ const stats = {
   },
 }
 
 const checkin = {
   checkin_date: '2026-08-12',
   checked_in: true,
   questions_completed: 7,
   consecutive_days: 2,
 }
 
+const emptyStats = {
+  practice: {
+    total_attempts: 0,
+    first_attempts: 0,
+    first_correct_attempts: 0,
+    accuracy: 0,
+    answered_questions: 0,
+    active_wrong_count: 0,
+    active_collection_count: 0,
+    checkin_days: 0,
+    consecutive_days: 0,
+    today_questions: 0,
+  },
+  exam: {
+    completed_exam_count: 0,
+    timed_out_exam_count: 0,
+    total_questions: 0,
+    correct_count: 0,
+    wrong_count: 0,
+    unanswered_count: 0,
+    average_score: null,
+    highest_score: null,
+    latest_score: null,
+  },
+}
+
+const emptyCheckin = {
+  checkin_date: '2026-08-12',
+  checked_in: false,
+  questions_completed: 0,
+  consecutive_days: 0,
+}
+
 describe('quiz catalog index', () => {
   afterEach(cleanup)
 
   beforeEach(() => {
     vi.clearAllMocks()
     vi.mocked(quizApi.listCategories).mockResolvedValue(categories)
     vi.mocked(quizApi.getStats).mockResolvedValue(stats)
     vi.mocked(quizApi.getCheckinStatus).mockResolvedValue(checkin)
   })
 
@@ -159,20 +192,53 @@ describe('quiz catalog index', () => {
     expect(await screen.findByText('统计数据加载失败')).toBeInTheDocument()
 
     fireEvent.click(screen.getByRole('button', { name: '重试统计数据' }))
 
     expect(await screen.findByText('83.3%')).toBeInTheDocument()
     expect(quizApi.getStats).toHaveBeenCalledTimes(2)
     expect(quizApi.listCategories).toHaveBeenCalledTimes(1)
     expect(quizApi.getCheckinStatus).toHaveBeenCalledTimes(1)
   })
 
+  it('renders meaningful empty guidance when authenticated stats and check-in have no activity', async () => {
+    vi.mocked(useAuth).mockReturnValue({ isChecked: true, isLoggedIn: true })
+    vi.mocked(quizApi.getStats).mockResolvedValue(emptyStats)
+    vi.mocked(quizApi.getCheckinStatus).mockResolvedValue(emptyCheckin)
+
+    render(<QuizIndexPage />)
+
+    expect(await screen.findByText('暂无答题统计，开始练习后可查看进度')).toBeInTheDocument()
+    expect(await screen.findByText('今日尚未答题，完成练习后即可打卡')).toBeInTheDocument()
+    expect(screen.queryByText('统计数据加载中…')).not.toBeInTheDocument()
+    expect(screen.queryByText('签到信息加载失败')).not.toBeInTheDocument()
+  })
+
+  it('keeps stats and categories visible when check-in fails and retries only check-in', async () => {
+    vi.mocked(useAuth).mockReturnValue({ isChecked: true, isLoggedIn: true })
+    vi.mocked(quizApi.getCheckinStatus)
+      .mockRejectedValueOnce(new Error('check-in unavailable'))
+      .mockResolvedValueOnce(checkin)
+
+    render(<QuizIndexPage />)
+
+    expect(await screen.findByText('83.3%')).toBeInTheDocument()
+    expect(await screen.findByText('签到信息加载失败')).toBeInTheDocument()
+    expect(screen.getByText('软件工程')).toBeInTheDocument()
+
+    fireEvent.click(screen.getByRole('button', { name: '重试签到信息' }))
+
+    expect(await screen.findByText('已连续打卡 2 天')).toBeInTheDocument()
+    expect(quizApi.getCheckinStatus).toHaveBeenCalledTimes(2)
+    expect(quizApi.getStats).toHaveBeenCalledTimes(1)
+    expect(quizApi.listCategories).toHaveBeenCalledTimes(1)
+  })
+
   it('exposes category loading, empty, error, and retry states', async () => {
     vi.mocked(useAuth).mockReturnValue({ isChecked: false, isLoggedIn: false })
     let rejectCategories: (reason: Error) => void = () => undefined
     vi.mocked(quizApi.listCategories).mockImplementationOnce(() => new Promise((_, reject) => {
       rejectCategories = reject
     }))
 
     render(<QuizIndexPage />)
     expect(screen.getByText('题目分类加载中…')).toBeInTheDocument()
 
diff --git a/src/pages/quiz/index.tsx b/src/pages/quiz/index.tsx
index 6324f1f..b3d2b45 100644
--- a/src/pages/quiz/index.tsx
+++ b/src/pages/quiz/index.tsx
@@ -5,25 +5,49 @@ import { Button } from '@/components/Button'
 import { CheckinBar } from '@/components/CheckinBar'
 import { PageHeader } from '@/components/PageHeader'
 import { QuizBottomNav } from '@/components/QuizBottomNav'
 import { QuizCategoryList } from '@/components/QuizCategoryList'
 import { QuizGrid } from '@/components/QuizGrid'
 import { QUIZ_BOTTOM, QUIZ_GRID } from '@/constants/quiz'
 import type { QuizBottomItem } from '@/constants/quiz'
 import { STRINGS } from '@/constants/strings'
 import { useAuth } from '@/hooks/useAuth'
 import { quizApi } from '@/services/quizService'
-import type { QuizCategoryNode, QuizStatsResponse } from '@/types/quiz'
+import type { QuizCategoryNode, QuizCheckinStatusResponse, QuizStatsResponse } from '@/types/quiz'
 import styles from './index.module.scss'
 
 type LoadState = 'loading' | 'ready' | 'empty' | 'error'
 
+function hasStatsActivity(stats: QuizStatsResponse) {
+  return [
+    stats.practice.total_attempts,
+    stats.practice.first_attempts,
+    stats.practice.first_correct_attempts,
+    stats.practice.answered_questions,
+    stats.practice.active_wrong_count,
+    stats.practice.active_collection_count,
+    stats.practice.checkin_days,
+    stats.practice.consecutive_days,
+    stats.practice.today_questions,
+    stats.exam.completed_exam_count,
+    stats.exam.timed_out_exam_count,
+    stats.exam.total_questions,
+    stats.exam.correct_count,
+    stats.exam.wrong_count,
+    stats.exam.unanswered_count,
+  ].some(value => value > 0)
+}
+
+function hasCheckinActivity(status: QuizCheckinStatusResponse) {
+  return status.checked_in || status.questions_completed > 0 || status.consecutive_days > 0
+}
+
 export default function QuizIndexPage() {
   const { isChecked, isLoggedIn } = useAuth()
   const [categories, setCategories] = useState<QuizCategoryNode[]>([])
   const [categoryState, setCategoryState] = useState<LoadState>('loading')
   const [stats, setStats] = useState<QuizStatsResponse | null>(null)
   const [statsState, setStatsState] = useState<LoadState>('loading')
   const [streakDays, setStreakDays] = useState(0)
   const [checkinState, setCheckinState] = useState<LoadState>('loading')
 
   const loadCategories = useCallback(async () => {
@@ -33,33 +57,34 @@ export default function QuizIndexPage() {
       setCategories(result)
       setCategoryState(result.length ? 'ready' : 'empty')
     } catch {
       setCategoryState('error')
     }
   }, [])
 
   const loadStats = useCallback(async () => {
     setStatsState('loading')
     try {
-      setStats(await quizApi.getStats())
-      setStatsState('ready')
+      const result = await quizApi.getStats()
+      setStats(result)
+      setStatsState(hasStatsActivity(result) ? 'ready' : 'empty')
     } catch {
       setStatsState('error')
     }
   }, [])
 
   const loadCheckin = useCallback(async () => {
     setCheckinState('loading')
     try {
       const status = await quizApi.getCheckinStatus()
       setStreakDays(status.consecutive_days)
-      setCheckinState('ready')
+      setCheckinState(hasCheckinActivity(status) ? 'ready' : 'empty')
     } catch {
       setCheckinState('error')
     }
   }, [])
 
   useEffect(() => { void loadCategories() }, [loadCategories])
 
   useEffect(() => {
     if (!isChecked || !isLoggedIn) return
     void loadStats()
@@ -82,25 +107,26 @@ export default function QuizIndexPage() {
   ] : []
 
   return (
     <View className={styles.page}>
       <PageHeader title={STRINGS.QUIZ_HEADER} shouldShowBack />
       <View className={styles.body}>
         {isChecked && isLoggedIn && (
           <>
             {checkinState === 'loading' && <Text className={styles.sectionState}>签到信息加载中…</Text>}
             {checkinState === 'error' && <View className={styles.sectionState}><Text>签到信息加载失败</Text><Button size='sm' onClick={loadCheckin}>重试签到信息</Button></View>}
+            {checkinState === 'empty' && <View className={styles.sectionState}><Text>今日尚未答题，完成练习后即可打卡</Text><Button size='sm' onClick={() => Taro.navigateTo({ url: '/pages/quiz/practice' })}>开始练习</Button></View>}
             {checkinState === 'ready' && <CheckinBar streakDays={streakDays} onCheckin={() => Taro.navigateTo({ url: '/pages/quiz/checkin' })} />}
 
             {statsState === 'loading' && <Text className={styles.sectionState}>统计数据加载中…</Text>}
             {statsState === 'error' && <View className={styles.sectionState}><Text>统计数据加载失败</Text><Button size='sm' onClick={loadStats}>重试统计数据</Button></View>}
-            {statsState === 'ready' && statCards.length === 0 && <Text className={styles.sectionState}>暂无统计数据</Text>}
+            {statsState === 'empty' && <Text className={styles.sectionState}>暂无答题统计，开始练习后可查看进度</Text>}
             {statsState === 'ready' && statCards.length > 0 && (
               <View className={styles.statsPanel}>
                 <View className={styles.statsGrid}>
                   {statCards.map(card => <View key={card.label} className={styles.statCard}><Text className={styles.statValue}>{card.value}</Text><Text className={styles.statLabel}>{card.label}</Text></View>)}
                 </View>
               </View>
             )}
             <QuizGrid items={QUIZ_GRID} onItemClick={(item) => Taro.navigateTo({ url: item.mode === 'mock' ? '/pages/quiz/mock' : `/pages/quiz/practice?mode=${item.mode}` })} />
           </>
         )}

