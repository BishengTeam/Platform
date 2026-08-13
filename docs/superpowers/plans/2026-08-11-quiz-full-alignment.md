# 微信小程序题库全量对齐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Platform 题库前端完整对齐 Backend 当前 22 个用户端题库接口，形成可通过微信构建、真实联调和双平台真机验收的练习与考试闭环。

**Architecture:** 以 Backend 契约为唯一事实源，先建立严格 DTO 和 API 层，再用纯函数适配器、练习幂等模块和考试保存队列承载业务状态，最后逐页替换旧逻辑。页面不本地判分、不本地决定会话或考试最终状态，并彻底删除旧接口、手动错题、手动签到和题库 mock 分支。

**Tech Stack:** Taro 4.2、React 18、TypeScript 5.4、Vitest、React Testing Library、微信小程序构建工具链。

## Global Constraints

- Backend 22 个用户端 operation 是唯一接口范围，不新增 Backend 兼容接口。
- 删除 `/api/quiz/submit`、`/api/quiz/progress`、手动错题、手动签到和本地考试结算。
- 分类树匿名可访问；题目、练习、资产、统计和考试需要登录。
- 题型严格支持 `single_choice | multiple_choice | judge`，答案严格使用 `string | string[]`。
- 错题只读且由后端自动维护；收藏新增和取消均使用 `question_id`。
- 倒计时、答案版本、会话状态和结算结果以服务端为准。
- 生产 API 必须为已加入微信小程序合法业务域名的 HTTPS 地址。
- 每个任务先写失败测试，再做最小实现；禁止以 `.catch(() => {})` 吞掉错误。

---

## File Structure

**Create:**

- `src/features/quiz/adapters.ts`：DTO 到页面模型的纯函数转换。
- `src/features/quiz/idempotency.ts`：练习提交幂等键生命周期。
- `src/features/quiz/examDraft.ts`：同题串行保存、版本推进与冲突恢复。
- `src/features/quiz/errors.ts`：题库错误到用户状态的映射。
- `src/pages/quiz/questions.tsx`、`questions.module.scss`：独立题目浏览。
- `src/pages/quiz/practice-history.tsx`、`practice-history.module.scss`：练习历史。
- `src/pages/quiz/exam-history.tsx`、`exam-history.module.scss`：考试历史与恢复入口。
- `src/pages/quiz/exam-result.tsx`、`exam-result.module.scss`：考试四状态详情。
- `src/features/quiz/__tests__/*.test.ts`：纯逻辑与服务契约测试。
- `src/pages/quiz/__tests__/*.test.tsx`：关键页面状态测试。
- `vitest.config.ts`、`src/test/setup.ts`：测试运行环境。

**Modify:**

- `package.json`：加入 typecheck/test 命令和测试依赖。
- `src/types/quiz.ts`：替换旧页面模型，定义完整 DTO 和联合状态。
- `src/services/quizService.ts`：实现 22 个 operation。
- `src/services/dataService.ts`：只导出新版题库服务。
- `src/utils/request.ts`、`src/utils/storage.ts`、`src/services/authService.ts`、`src/app.tsx`、`src/hooks/useAuth.ts`：Token 刷新与认证竞态。
- `src/pages/quiz/index.tsx`：匿名分类和登录后仪表盘。
- `src/pages/quiz/practice.tsx`：服务端练习会话。
- `src/pages/quiz/mock.tsx`：服务端模拟考试。
- `src/pages/quiz/wrong-book.tsx`、`collections.tsx`、`checkin.tsx`：新版用户资产。
- `src/app.config.ts`、`src/constants/routes.ts`、`src/constants/quiz.ts`：注册新页面和入口。
- `.env.production`、`project.config.json`：发布配置。

---

### Task 1: 建立可执行的类型检查与测试门禁

**Files:**
- Modify: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/features/quiz/__tests__/testHarness.test.ts`

**Interfaces:**
- Produces: `npm run typecheck`、`npm test -- --run`、`npm run build:weapp` 三个发布门禁命令。

- [ ] **Step 1: 添加测试依赖和脚本**

在 `package.json` 增加：

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "test": "vitest",
    "quality:quiz": "npm run typecheck && npm test -- --run && npm run build:weapp"
  },
  "devDependencies": {
    "@testing-library/react": "^16.3.0",
    "@testing-library/jest-dom": "^6.6.3",
    "jsdom": "^26.1.0",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 2: 创建最小测试配置**

先创建项目级 `tsconfig.json`，继承 Taro 推荐配置并启用 `strict`、`noEmit`、`jsx: react-jsx`、`baseUrl: .` 和 `@/* -> src/*` 路径映射；包含 `src`、`types`、`config`、`vitest.config.ts`，排除 `dist` 和 `node_modules`。不得通过关闭 strict 或 skipLibCheck 掩盖业务类型错误。

```ts
// vitest.config.ts
import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'] },
})
```

```ts
// src/test/setup.ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 3: 写并运行真实配置加载测试**

```ts
import { describe, expect, it } from 'vitest'
import config from '../../../../vitest.config'

describe('quiz test configuration', () => {
  it('resolves the production @ alias and browser test environment', () => {
    expect(config.resolve?.alias).toMatchObject({ '@': expect.stringMatching(/[\\/]src$/) })
    expect(config.test?.environment).toBe('jsdom')
  })
})
```

Run: `npm test -- --run src/features/quiz/__tests__/testHarness.test.ts`
Expected: `1 passed`。

- [ ] **Step 4: 运行初始类型检查并记录现有错误**

Run: `npm run typecheck`
Expected: 命令可运行；现有错误作为后续任务输入，不能通过降低 strictness 消除。

- [ ] **Step 5: 提交**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts src/test/setup.ts src/features/quiz/__tests__/testHarness.test.ts
git commit -m "test: add quiz frontend quality gates"
```

### Task 2: 用严格类型覆盖 22 个用户端接口

**Files:**
- Modify: `src/types/quiz.ts`
- Test: `src/features/quiz/__tests__/quizTypes.test.ts`

**Interfaces:**
- Produces: `QuizAnswer`、`QuizQuestionType`、`QuizPracticeSession`、`QuizPracticeAttemptResult`、`QuizStatsResponse`、`QuizExamDetail` 等严格类型。

- [ ] **Step 1: 写编译期类型测试**

```ts
import type { QuizAnswer, QuizExamDetail, QuizStatsResponse } from '@/types/quiz'

const single = 'A' satisfies QuizAnswer
const multiple = ['A', 'C'] satisfies QuizAnswer
const settled = {
  id: 1, status: 'completed', category_id: 2, question_count: 10,
  duration_seconds: 3600, started_at: '2026-08-11T09:00:00+08:00',
  deadline_at: '2026-08-11T10:00:00+08:00', finished_at: '2026-08-11T09:45:00+08:00',
  correct_count: 8, wrong_count: 1, unanswered_count: 1, score: 80,
  questions: [],
} satisfies QuizExamDetail
const stats = {
  practice: {
    total_attempts: 0, first_attempts: 0, first_correct_attempts: 0,
    accuracy: 0, answered_questions: 0, active_wrong_count: 0,
    active_collection_count: 0, checkin_days: 0, consecutive_days: 0,
    today_questions: 0,
  },
  exam: {
    completed_exam_count: 0, timed_out_exam_count: 0, total_questions: 0,
    correct_count: 0, wrong_count: 0, unanswered_count: 0,
    average_score: null, highest_score: null, latest_score: null,
  },
} satisfies QuizStatsResponse

// @ts-expect-error judge is a supported question type; arbitrary strings are not.
const invalidType: QuizQuestionType = 'essay'
void [single, multiple, settled, stats]
```

Run: `npm run typecheck`
Expected: FAIL，因为新版类型尚不存在。

- [ ] **Step 2: 替换旧题型和答案类型**

```ts
export type QuizQuestionType = 'single_choice' | 'multiple_choice' | 'judge'
export type QuizAnswer = string | string[]
export type QuizPracticeMode = 'normal' | 'wrong'
export type QuizPracticeStatus = 'in_progress' | 'completed' | 'abandoned'
export type QuizExamStatus = 'in_progress' | 'completed' | 'timed_out' | 'abandoned'
```

- [ ] **Step 3: 按 Backend `quiz_contract.py` 逐字段定义请求和响应**

必须包含分类、公开题目、练习创建/会话/作答/历史、错题、收藏、打卡、统计、考试创建/列表/四状态详情/答案保存/动作响应以及分页模型。字段名保持 snake_case，不在类型层伪造旧 camelCase 字段。

- [ ] **Step 4: 用 discriminated union 定义考试详情**

```ts
export type QuizExamDetail =
  | QuizExamInProgressDetail
  | QuizExamAbandonedDetail
  | QuizExamSettledDetail
```

确保只有 `completed | timed_out` 类型含 `correct_answer` 和 `explanation`。

- [ ] **Step 5: 运行类型检查**

Run: `npm run typecheck`
Expected: 类型测试通过；旧页面因接口变更产生的错误允许留给后续任务，但不得使用 `any` 或 `unknown` 强制断言绕过。

- [ ] **Step 6: 提交**

```bash
git add src/types/quiz.ts src/features/quiz/__tests__/quizTypes.test.ts
git commit -m "refactor: define strict quiz API contracts"
```

### Task 3: 重建题库 API 服务并删除旧路径

**Files:**
- Modify: `src/services/quizService.ts`
- Modify: `src/services/dataService.ts`
- Test: `src/features/quiz/__tests__/quizService.test.ts`

**Interfaces:**
- Consumes: Task 2 的严格 DTO。
- Produces: `quizApi`，方法名与 22 个 operation 一一对应。

- [ ] **Step 1: mock 请求模块并写失败契约测试**

```ts
vi.mock('@/utils/request', () => ({
  get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn(),
}))

it('submits a practice attempt to the session endpoint', async () => {
  await quizApi.submitPracticeAttempt(7, {
    session_question_id: 9,
    idempotency_key: 'attempt-12345678',
    user_answer: ['A', 'C'],
  })
  expect(post).toHaveBeenCalledWith('/api/quiz/practice-sessions/7/attempts', expect.any(Object))
})
```

Run: `npm test -- --run src/features/quiz/__tests__/quizService.test.ts`
Expected: FAIL，因为 `quizApi` 尚不存在。

- [ ] **Step 2: 实现 15 个非考试 operation**

实现：分类、题目、练习创建、当前练习、练习详情、提交作答、放弃、练习历史、错题、收藏列表/新增/取消、打卡状态、打卡日历、统计。日历必须发送 `date_from/date_to`，取消收藏路径必须使用 `questionId`。

- [ ] **Step 3: 实现 7 个考试 operation**

```ts
createExam(body)
getCurrentExam()
listExams(query)
getExam(examId)
saveExamAnswer(examId, examQuestionId, body)
submitExam(examId)
abandonExam(examId)
```

考试总 operation 按 Backend 路由核对；禁止调用题目列表来生成考试。

- [ ] **Step 4: 删除旧实现**

删除 `USE_MOCK`、题库 mock import、`submitQuizAnswer`、`getQuizProgress`、`addWrongBook`、`removeWrongBook`。更新 `dataService.ts`，不再导出这些符号。

- [ ] **Step 5: 增加请求行为防回归测试**

通过真实 `quizApi` 方法的请求边界测试覆盖练习提交、收藏取消、打卡日期和考试保存路径；测试必须因错误 method/path/payload 而失败。旧源码路径的全仓防回归由 Task 13 的可执行契约扫描器负责。

- [ ] **Step 6: 运行测试并提交**

Run: `npm test -- --run src/features/quiz/__tests__/quizService.test.ts`
Expected: PASS。

```bash
git add src/services/quizService.ts src/services/dataService.ts src/features/quiz/__tests__/quizService.test.ts
git commit -m "refactor: align quiz service with backend contract"
```

### Task 4: 建立题库适配器、错误模型和答案隔离测试

**Files:**
- Create: `src/features/quiz/adapters.ts`
- Create: `src/features/quiz/errors.ts`
- Test: `src/features/quiz/__tests__/adapters.test.ts`
- Test: `src/features/quiz/__tests__/errors.test.ts`

**Interfaces:**
- Produces: `toQuestionViewModel`、`toQuizErrorState`、`formatQuizAnswer`。

- [ ] **Step 1: 写三题型映射失败测试**

```ts
expect(toQuestionViewModel(judgeQuestion).type).toBe('judge')
expect(formatQuizAnswer(['C', 'A'])).toEqual(['A', 'C'])
```

- [ ] **Step 2: 写答案隔离失败测试**

对题目列表、错题列表、收藏列表、进行中考试和已放弃考试序列化结果断言不存在 `correct_answer`、`explanation`。

- [ ] **Step 3: 实现纯函数适配器**

保持 DTO 不变，只生成页面显示所需字段；判断题不能降级成单选题，多选答案排序去重。

- [ ] **Step 4: 实现统一错误状态**

```ts
export type QuizErrorState =
  | { kind: 'unauthorized' }
  | { kind: 'forbidden'; message: string }
  | { kind: 'not_found'; message: string }
  | { kind: 'conflict'; message: string }
  | { kind: 'validation'; message: string }
  | { kind: 'rate_limited'; message: string }
  | { kind: 'network'; message: string }
```

- [ ] **Step 5: 运行测试并提交**

Run: `npm test -- --run src/features/quiz/__tests__/adapters.test.ts src/features/quiz/__tests__/errors.test.ts`
Expected: PASS。

```bash
git add src/features/quiz/adapters.ts src/features/quiz/errors.ts src/features/quiz/__tests__
git commit -m "feat: add quiz adapters and error states"
```

### Task 5: 修复认证生命周期与单例 Token 刷新

**Files:**
- Modify: `src/utils/storage.ts`
- Modify: `src/utils/request.ts`
- Modify: `src/services/authService.ts`
- Modify: `src/app.tsx`
- Modify: `src/hooks/useAuth.ts`
- Test: `src/features/quiz/__tests__/authRecovery.test.ts`

**Interfaces:**
- Produces: `getAuthSession()`、`setAuthSession()`、`clearAuthSession()`、`ensureAuthenticated()`；请求层对并发 401 只执行一次 refresh。

- [ ] **Step 1: 写 mock_token 禁止测试和并发刷新测试**

```ts
it('never writes a mock token when token is missing', () => {
  setAuthSession(undefined)
  expect(Taro.setStorageSync).not.toHaveBeenCalledWith('auth_token', 'mock_token')
})

it('shares one refresh request across concurrent 401 responses', async () => {
  await Promise.all([requestA(), requestB()])
  expect(refreshToken).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: 用单一认证对象替代分散 Token**

```ts
export interface AuthSession {
  accessToken: string
  refreshToken: string
  expiresAt: number
}
```

删除 `setAuthToken(token?: string)` 的默认假 Token 行为。

- [ ] **Step 3: 实现 refreshPromise 单例**

401 时只刷新一次并重放原请求一次；刷新请求自身 401 或重放仍 401 时清理会话并跳登录，禁止无限递归。

- [ ] **Step 4: 修复启动登录竞态**

`App` 完成已有会话检查/微信登录后设置认证初始化完成状态；`useAuth` 订阅该状态。受保护页面在初始化完成前显示 loading，不提前跳转。

- [ ] **Step 5: 运行测试并提交**

Run: `npm test -- --run src/features/quiz/__tests__/authRecovery.test.ts`
Expected: PASS。

```bash
git add src/utils/storage.ts src/utils/request.ts src/services/authService.ts src/app.tsx src/hooks/useAuth.ts src/features/quiz/__tests__/authRecovery.test.ts
git commit -m "fix: make authentication refresh and recovery reliable"
```

### Task 6: 完成匿名分类首页与独立题目浏览

**Files:**
- Modify: `src/pages/quiz/index.tsx`
- Create: `src/pages/quiz/questions.tsx`
- Create: `src/pages/quiz/questions.module.scss`
- Modify: `src/app.config.ts`
- Modify: `src/constants/routes.ts`
- Test: `src/pages/quiz/__tests__/index.test.tsx`
- Test: `src/pages/quiz/__tests__/questions.test.tsx`

**Interfaces:**
- Consumes: `quizApi.listCategories()`、`quizApi.listQuestions()`。
- Produces: 匿名分类树和登录后分页题目浏览。

- [ ] **Step 1: 写匿名首页失败测试**

未登录渲染首页，断言分类树可见且统计区显示登录提示，而不是整页重定向。

- [ ] **Step 2: 移除首页整体 AuthGuard**

分类请求独立执行；统计和打卡仅在已登录时请求。分类失败提供错误态和重试按钮，不能以空数组伪装成功。

- [ ] **Step 3: 写题目浏览的答案隔离与分页测试**

断言筛选参数为 `category_id/question_type/page/page_size`，列表只显示题干和选项。

- [ ] **Step 4: 实现并注册题目浏览页**

在 `app.config.ts` 的 quiz 子包加入 `questions`。分类点击提供“浏览题目”和“开始练习”两个明确动作。

- [ ] **Step 5: 运行测试并提交**

Run: `npm test -- --run src/pages/quiz/__tests__/index.test.tsx src/pages/quiz/__tests__/questions.test.tsx`
Expected: PASS。

```bash
git add src/pages/quiz/index.tsx src/pages/quiz/questions.tsx src/pages/quiz/questions.module.scss src/app.config.ts src/constants/routes.ts src/pages/quiz/__tests__
git commit -m "feat: add anonymous quiz catalog and question browser"
```

### Task 7: 重写服务端练习会话与幂等提交

**Files:**
- Create: `src/features/quiz/idempotency.ts`
- Modify: `src/pages/quiz/practice.tsx`
- Modify: `src/pages/quiz/practice.module.scss`
- Test: `src/features/quiz/__tests__/idempotency.test.ts`
- Test: `src/pages/quiz/__tests__/practice.test.tsx`

**Interfaces:**
- Produces: `getOrCreateAttemptKey(sessionId, sessionQuestionId, localAttemptId)`、`clearAttemptKey(...)`。

- [ ] **Step 1: 写幂等键生命周期测试**

同一次网络重试返回相同键；成功后清理；用户显式重答生成新键。键长度必须为 8–64。

- [ ] **Step 2: 写会话创建与恢复测试**

页面加载先查询当前会话；有活动会话则恢复，没有则显示模式、分类及 `10/20/50/100` 题量选择。

- [ ] **Step 3: 替换旧题目列表加载**

普通模式调用 `createPracticeSession({ mode: 'normal', category_id, question_count })`；错题模式调用 `{ mode: 'wrong', question_count }`。页面只消费会话快照，不再调用 `/questions` 形成练习。

- [ ] **Step 4: 替换答题提交**

提交 `session_question_id/idempotency_key/user_answer`，成功后展示服务端结果并刷新会话状态；失败保留键和用户选择，显示显式重试。

- [ ] **Step 5: 实现重答、自动完成和放弃**

重答生成新本地 attempt ID；完成后只读；离开活动会话时允许继续保留或二次确认放弃。

- [ ] **Step 6: 删除手动错题按钮及旧本地判分**

收藏仍按 question ID 操作；删除 `addWrongBook/removeWrongBook/submitQuizAnswer` 的所有调用。

- [ ] **Step 7: 运行测试并提交**

Run: `npm test -- --run src/features/quiz/__tests__/idempotency.test.ts src/pages/quiz/__tests__/practice.test.tsx`
Expected: PASS。

```bash
git add src/features/quiz/idempotency.ts src/pages/quiz/practice.tsx src/pages/quiz/practice.module.scss src/features/quiz/__tests__/idempotency.test.ts src/pages/quiz/__tests__/practice.test.tsx
git commit -m "feat: implement resumable quiz practice sessions"
```

### Task 8: 增加练习历史并修复错题、收藏、自动打卡

**Files:**
- Create: `src/pages/quiz/practice-history.tsx`
- Create: `src/pages/quiz/practice-history.module.scss`
- Modify: `src/pages/quiz/wrong-book.tsx`
- Modify: `src/pages/quiz/collections.tsx`
- Modify: `src/pages/quiz/checkin.tsx`
- Modify: `src/app.config.ts`
- Modify: `src/constants/quiz.ts`
- Test: `src/pages/quiz/__tests__/practiceAssets.test.tsx`

**Interfaces:**
- Consumes: 练习历史、错题、收藏、打卡三个服务分组。

- [ ] **Step 1: 写资产契约失败测试**

断言取消收藏传 `question_id`；错题页没有删除按钮；日历请求发送具体起止日期；页面没有手动签到按钮。

- [ ] **Step 2: 实现练习历史页**

支持分类、题型、正误、起止日期、分页；展示冻结题干、用户答案、标准答案、解析、判定、attempt_no 和提交时间。

- [ ] **Step 3: 改造错题页**

映射 `latest_wrong_at/question_status/usable_for_practice`。专项入口创建 `mode=wrong` 会话，不能按分类启动普通练习。

- [ ] **Step 4: 修复收藏页**

取消收藏使用题目 ID；显示 `is_active/question_status`；移除“收藏专项练习”，停用题不提供练习动作。

- [ ] **Step 5: 修复打卡页**

生成上海时区口径的 `date_from/date_to` 请求；删除 `submitCheckin` 和按钮；从 `/checkin` 读取连续天数，从 calendar 汇总展示记录。

- [ ] **Step 6: 注册历史入口并运行测试**

Run: `npm test -- --run src/pages/quiz/__tests__/practiceAssets.test.tsx`
Expected: PASS。

- [ ] **Step 7: 提交**

```bash
git add src/pages/quiz src/app.config.ts src/constants/quiz.ts
git commit -m "feat: complete quiz history and user assets"
```

### Task 9: 对齐练习与考试分区统计

**Files:**
- Modify: `src/pages/quiz/index.tsx`
- Modify: `src/components/QuizGrid/index.tsx`
- Test: `src/pages/quiz/__tests__/stats.test.tsx`

**Interfaces:**
- Consumes: `QuizStatsResponse { practice, exam }`。

- [ ] **Step 1: 写嵌套统计映射失败测试**

构造 practice/exam 数据，断言首答正确率、活动错题、收藏、连续打卡、完成考试、超时考试、平均分和最高分分别显示。

- [ ] **Step 2: 删除旧扁平统计字段**

删除 `totalAnswers/totalQuestions/completionRate/todayAnswers` 等旧字段猜测，不调用 `/progress`。

- [ ] **Step 3: 实现两个明确统计分区**

数值为 null 时显示 `--`，零显示 `0`；百分比沿用后端 0–100 值，不再次乘 100。

- [ ] **Step 4: 运行测试并提交**

Run: `npm test -- --run src/pages/quiz/__tests__/stats.test.tsx`
Expected: PASS。

```bash
git add src/pages/quiz/index.tsx src/components/QuizGrid/index.tsx src/pages/quiz/__tests__/stats.test.tsx
git commit -m "fix: align quiz practice and exam statistics"
```

### Task 10: 重写服务端模拟考试、自动保存和冲突恢复

**Files:**
- Create: `src/features/quiz/examDraft.ts`
- Modify: `src/pages/quiz/mock.tsx`
- Modify: `src/pages/quiz/mock.module.scss`
- Test: `src/features/quiz/__tests__/examDraft.test.ts`
- Test: `src/pages/quiz/__tests__/mockExam.test.tsx`

**Interfaces:**
- Produces: `ExamSaveQueue.enqueue(examId, examQuestionId, answer, lockVersion)`；同一题严格串行。

- [ ] **Step 1: 写保存队列失败测试**

快速连续选择 A、B、C 时，同一题请求按顺序执行；下一请求使用上一响应的 `lock_version`；最终状态为 C。

- [ ] **Step 2: 写 409 恢复测试**

保存返回 409 时调用 `getExam(examId)`，用服务端答案和版本替换本地已确认状态，保留冲突提示。

- [ ] **Step 3: 实现考试创建和恢复入口**

页面先查 `/exams/current`；无当前考试则选择分类与 `10/20/50/100` 题量创建；题量不足错误显示后端允许最大值。

- [ ] **Step 4: 用服务端时间实现显示倒计时**

计算 `deadline_at - server_time` 得到基准剩余秒数，再用本地经过时间更新显示。归零后停止编辑并刷新考试详情，不在前端自行结算。

- [ ] **Step 5: 接入答案自动保存**

选择变化进入保存队列；展示保存中、已保存、保存失败可重试。切题不取消已发请求，离开页面前提示尚未确认保存的答案。

- [ ] **Step 6: 接入交卷和放弃**

交卷前计算未答数并二次确认；提交和放弃均以服务端响应跳转结果页。删除逐题 `/submit`、本地得分和手动错题逻辑。

- [ ] **Step 7: 运行测试并提交**

Run: `npm test -- --run src/features/quiz/__tests__/examDraft.test.ts src/pages/quiz/__tests__/mockExam.test.tsx`
Expected: PASS。

```bash
git add src/features/quiz/examDraft.ts src/pages/quiz/mock.tsx src/pages/quiz/mock.module.scss src/features/quiz/__tests__/examDraft.test.ts src/pages/quiz/__tests__/mockExam.test.tsx
git commit -m "feat: implement server-backed mock exams"
```

### Task 11: 增加考试历史、结果页与答案可见性保护

**Files:**
- Create: `src/pages/quiz/exam-history.tsx`
- Create: `src/pages/quiz/exam-history.module.scss`
- Create: `src/pages/quiz/exam-result.tsx`
- Create: `src/pages/quiz/exam-result.module.scss`
- Modify: `src/app.config.ts`
- Modify: `src/constants/quiz.ts`
- Test: `src/pages/quiz/__tests__/examHistory.test.tsx`
- Test: `src/pages/quiz/__tests__/examVisibility.test.tsx`

**Interfaces:**
- Consumes: 考试列表与 `QuizExamDetail` discriminated union。

- [ ] **Step 1: 写四状态可见性失败测试**

`in_progress/abandoned` 不渲染标准答案、解析、分数；`completed/timed_out` 渲染完整结算结果。

- [ ] **Step 2: 实现考试历史页**

分页展示状态、题量、开始/结束时间和分数；进行中记录进入考试页，其余进入结果页。

- [ ] **Step 3: 实现结果页**

使用 status switch 穷尽四状态。完成/超时显示答对、答错、未答、分数和逐题结果；放弃只显示已作答标记；进行中引导继续考试。

- [ ] **Step 4: 注册页面与入口**

在 quiz 子包加入 `exam-history`、`exam-result`；首页增加考试历史入口。

- [ ] **Step 5: 运行测试并提交**

Run: `npm test -- --run src/pages/quiz/__tests__/examHistory.test.tsx src/pages/quiz/__tests__/examVisibility.test.tsx`
Expected: PASS。

```bash
git add src/pages/quiz/exam-history* src/pages/quiz/exam-result* src/app.config.ts src/constants/quiz.ts src/pages/quiz/__tests__
git commit -m "feat: add quiz exam history and secure results"
```

### Task 12: 统一错误状态并清除静默失败

**Files:**
- Modify: `src/pages/quiz/index.tsx`
- Modify: `src/pages/quiz/questions.tsx`
- Modify: `src/pages/quiz/practice.tsx`
- Modify: `src/pages/quiz/practice-history.tsx`
- Modify: `src/pages/quiz/wrong-book.tsx`
- Modify: `src/pages/quiz/collections.tsx`
- Modify: `src/pages/quiz/checkin.tsx`
- Modify: `src/pages/quiz/mock.tsx`
- Modify: `src/pages/quiz/exam-history.tsx`
- Modify: `src/pages/quiz/exam-result.tsx`
- Test: `src/pages/quiz/__tests__/errorStates.test.tsx`

**Interfaces:**
- Consumes: `toQuizErrorState()`。

- [ ] **Step 1: 写错误矩阵测试**

对 403、404、409、422、429 和网络错误分别断言文案、重试动作和状态保留；401 由请求层处理。

- [ ] **Step 2: 为所有页面加入 loading/empty/error/retry**

加载失败不能展示为空数据。练习/考试网络失败必须保留会话 ID、考试 ID、幂等键、答案和保存状态。

- [ ] **Step 3: 扫描并删除静默 catch**

Run: `Get-ChildItem src/pages/quiz -Recurse -File | Select-String -Pattern 'catch\(\(\) => \{\}\)'`
Expected: 无匹配。

- [ ] **Step 4: 运行测试并提交**

Run: `npm test -- --run src/pages/quiz/__tests__/errorStates.test.tsx`
Expected: PASS。

```bash
git add src/pages/quiz src/pages/quiz/__tests__/errorStates.test.tsx
git commit -m "fix: make quiz errors visible and retryable"
```

### Task 13: 收紧生产配置并执行契约防回归扫描

**Files:**
- Modify: `.env.production`
- Modify: `project.config.json`
- Create: `scripts/check-quiz-contract.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm run check:quiz-contract`，阻止旧路径和生产 HTTP 回归。

- [ ] **Step 1: 编写契约扫描脚本**

脚本递归扫描 `src/**/*.{ts,tsx}`，发现以下内容返回非零：

```text
/api/quiz/submit
/api/quiz/progress
POST /api/quiz/wrong-book
DELETE /api/quiz/wrong-book
mock_token
```

同时统计 `quizApi` operation，要求与 Backend 当前 22 个用户端 operation 一致。

- [ ] **Step 2: 先运行并确认扫描能抓到遗留项**

Run: `node scripts/check-quiz-contract.mjs`
Expected: 如仍有遗留则 FAIL 并输出文件和行号；清理后 PASS。

- [ ] **Step 3: 替换生产 API 配置**

删除仓库中提交的 HTTP IP 地址。构建时由部署环境注入已备案且已加入微信合法 request 域名的 `TARO_APP_API_BASE`；生产配置校验必须在值为空、不是 HTTPS 或主机为 IP 地址时直接失败。

```dotenv
TARO_APP_API_BASE=${QUIZ_PRODUCTION_API_BASE}
```

若当前 Taro dotenv 流程不展开变量，则 `.env.production` 只保留非敏感配置，由 CI 在构建命令前设置 `TARO_APP_API_BASE`。微信公众平台同步加入同一 request 合法域名。

- [ ] **Step 4: 收紧微信项目配置**

开启生产域名检查和压缩；本地开发需要跳过校验时只使用开发者工具本地设置，不提交生产绕过配置。

- [ ] **Step 5: 接入质量命令并提交**

`quality:quiz` 前置执行 `check:quiz-contract`。

```bash
git add .env.production project.config.json scripts/check-quiz-contract.mjs package.json package-lock.json
git commit -m "chore: enforce quiz release contract and https"
```

### Task 14: 完整自动化、真实联调和微信真机发布验收

**Files:**
- Create: `docs/quiz-release-checklist.md`
- Modify: 仅修复本任务验证发现的题库缺陷文件。

**Interfaces:**
- Produces: 可复查的发布验证记录。

- [ ] **Step 1: 运行静态契约扫描**

Run: `npm run check:quiz-contract`
Expected: PASS，22 个 operation 对齐且无旧路径。

- [ ] **Step 2: 运行类型检查和全部测试**

Run: `npm run typecheck`
Expected: PASS。

Run: `npm test -- --run`
Expected: PASS，无 skipped 题库关键用例。

- [ ] **Step 3: 构建微信生产包**

Run: `npm run build:weapp`
Expected: 返回 0，`dist` 为本次源码生成，无 TypeScript、Sass 或分包错误。

- [ ] **Step 4: 在测试环境执行真实 Backend E2E**

逐项验证：匿名分类；登录题目浏览；普通练习创建/恢复/重答/完成/放弃；错题专项；收藏；自动打卡；练习历史；统计；考试创建/自动保存/409/交卷/放弃/超时/历史；401 刷新；422/429；断网重试。

- [ ] **Step 5: 执行答案泄露检查**

抓包确认题目列表、错题、收藏、进行中考试和已放弃考试响应及页面均不显示 `correct_answer/explanation`；只有练习提交结果和已结算考试可以显示。

- [ ] **Step 6: Android 与 iOS 各完成一次真机回归**

两端分别覆盖微信登录、Token 刷新、换机恢复练习、考试自动保存、断网重连、超时结算、返回前后台、收藏取消、打卡日期边界。

- [ ] **Step 7: 填写发布清单**

`docs/quiz-release-checklist.md` 记录命令、版本、测试环境、设备型号、微信版本、执行人、时间、结果、失败日志链接和最终签字。任何 P0 项失败均禁止发布。

- [ ] **Step 8: 最终提交**

```bash
git add docs/quiz-release-checklist.md
git commit -m "docs: record quiz miniprogram release verification"
```

---

## Recommended Execution Order

严格按 Task 1 → 14 执行。Task 1–5 建立基础契约和认证；Task 6–9 完成浏览、练习及用户资产；Task 10–11 完成考试闭环；Task 12–14 负责错误治理和发布验收。未经 Task 13 的 HTTPS 与契约扫描、Task 14 的双平台真机验收，不应提交微信正式审核。
