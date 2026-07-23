# 前后端 API 不匹配修复建议

> 扫描范围：前端 `src/services/` + `src/utils/request.ts`，后端 `Customer/Backend/app/api/` + `app/schemas/`
> 扫描日期：2026-07-23

---

## 一、修复优先级总览

| 级别 | 数量 | 说明 |
|------|------|------|
| 🔴 严重 | 15 | 调用即报错（404/422/丢失 baseUrl） |
| 🟠 高 | 10 | 能请求通，但字段解析错误或展示异常 |
| 🟡 中 | 7 | 功能可用，但有隐患或数据不全 |

**建议修复顺序**：先全部处理 🔴，再处理 🟠，最后处理 🟡 并补充后端已提供但前端未对接的能力。

---

## 二、🔴 严重修复项（调用即报错）

### 1. `createOrder` 请求体字段不匹配

**文件**：`src/services/userService.ts:245`

**问题**：前端发送 `{ cert_type, candidate_name, candidate_phone, ... }`，后端 `POST /api/orders` 要求：
- 必填 `order_kind`（`'certification' | 'course'`）
- 必填 `product_type`（商品类型代码）
- 没有 `cert_type` 字段

**修复代码**：

```ts
export async function createOrder(data: {
  order_kind: 'certification' | 'course'
  product_type: string
  candidate_name: string
  candidate_phone: string
  candidate_idcard?: string
  plan_id?: number           // 认证报名需要批次 ID
  extra_data?: Record<string, unknown>
  attachments?: string[]
}): Promise<{ id: number; status: string; created_at: string }> {
  if (USE_MOCK) return { id: Math.floor(Math.random() * 10000), status: 'pending', created_at: new Date().toISOString() }
  const res = await post<{ id: number; status: string; created_at: string }>('/api/orders', data as unknown as Record<string, unknown>)
  return res.data
}
```

**调用方改造**：所有报名表单需要同时传入 `order_kind` 和 `product_type`。

---

### 2. 订单相关字段 `cert_type` → `product_type`

**文件**：`src/services/userService.ts:107-130、135-157、224-238`

**问题**：`getOrders` / `getOrderDetail` / `getRegisteredExams` 中读取 `item.cert_type`，后端字段名为 `product_type`。

**修复**：统一替换为 `product_type`。

```ts
// toOrder
return {
  id: String(item.id),
  title: item.candidate_name || item.product_type,
  description: `${item.product_type}（${maskPhone(item.candidate_phone)}）`,
  status: mapBackendStatus(item.status),
  date,
  amount,
}

// toOrderDetail
courseSubtitle: item.product_type ? `${item.product_type} · 报名` : '',

// getRegisteredExams
name: item.product_type,
examCode: item.product_type,
```

---

### 3. `getSangforVerifyCode` HTTP 方法错误

**文件**：`src/services/userService.ts:550`

**问题**：前端用 `POST`，后端 `GET /api/cert/sangfor/verify-code`。

**修复**：

```ts
export async function getSangforVerifyCode(): Promise<{ code: string }> {
  if (USE_MOCK) return { code: '123456' }
  const res = await get<{ code: string }>('/api/cert/sangfor/verify-code')
  return res.data
}
```

---

### 4. `getNispPinyin` 查询参数错误

**文件**：`src/services/userService.ts:555`

**问题**：前端用 `text=${name}`，后端要求 `name=`。

**修复**：

```ts
export async function getNispPinyin(name: string): Promise<{ pinyin: string }> {
  if (USE_MOCK) return { pinyin: 'zhangsan' }
  const res = await get<{ pinyin: string }>('/api/cert/nisp/pinyin', { name })
  return res.data
}
```

---

### 5. `registerActivity` 路径不存在

**文件**：`src/services/userService.ts:613`

**问题**：前端调用 `POST /api/activities/${activityId}/register`，后端只有：
- `POST /api/activities/register`（body 传 `activity_id`）
- `POST /api/activities/{activity_id}/enroll`（enroll 别名）

**修复**：推荐走 `/api/activities/register`：

```ts
export async function registerActivity(activityId: number, name: string, phone: string, remark?: string): Promise<void> {
  if (USE_MOCK) return
  await post('/api/activities/register', { activity_id: activityId, name, phone, remark: remark ?? null })
}
```

---

### 6. `removeFavorite` / `removeCollection` DELETE 参数位置错误

**文件**：`src/services/userService.ts:299、599`

**问题**：前端把参数放 body/query（`del('/api/collections', { target_type, target_id })`），后端要求路径参数 `DELETE /api/collections/{collection_id}`。

**修复方案 A**（推荐，符合后端设计）：

```ts
export async function removeFavorite(collectionId: number): Promise<void> {
  if (USE_MOCK) return
  await del(`/api/collections/${collectionId}`)
}
```

调用方需要先拿到收藏记录的 `id`（来自 `getMyCollections` 的 `id` 字段），而不是用 `target_id` 删除。

**修复方案 B**（若业务上必须按 target 删除）：改后端新增 `DELETE /api/collections?target_type=&target_id=`。

---

### 7. `getSangforCoupons` 调错接口

**文件**：`src/services/userService.ts:546`

**问题**：直接返回 `getCoupons()`，调用的是 `/api/coupons`。

**修复**：

```ts
export async function getSangforCoupons(): Promise<Array<{ id: string; name: string; code: string }>> {
  if (USE_MOCK) return []
  const res = await get<Array<{ id: number; name: string; code: string }>>('/api/cert/sangfor/coupons')
  return (res.data || []).map(c => ({ id: String(c.id), name: c.name, code: c.code }))
}
```

---

### 8. `claimPoints` 缺少必填字段 `scene`

**文件**：`src/services/userService.ts:571`

**问题**：后端 `POST /api/points/claim` 要求 `scene: 'daily_checkin' | 'quiz_task' | 'new_user' | 'activity'`。

**修复**：

```ts
export async function claimPoints(scene: 'daily_checkin' | 'quiz_task' | 'new_user' | 'activity', amount: number, sourceId?: string): Promise<void> {
  if (USE_MOCK) return
  await post('/api/points/claim', { scene, amount, source_id: sourceId })
}
```

---

### 9. `redeemPoints` 缺少必填字段 `redeem_type`

**文件**：`src/services/userService.ts:576`

**问题**：后端 `POST /api/points/redeem` 要求 `redeem_type: 'exam_discount' | 'course'`。

**修复**：

```ts
export async function redeemPoints(redeemType: 'exam_discount' | 'course', amount: number, targetId?: number): Promise<void> {
  if (USE_MOCK) return
  await post('/api/points/redeem', { redeem_type: redeemType, amount, target_id: targetId })
}
```

---

### 10. `getMediaUrl` / `getSystemMediaUrl` 响应类型错误

**文件**：`src/services/userService.ts:673、739`

**问题**：后端 `GET /api/media/{file_id}` 返回二进制 `FileResponse`，不是 JSON `{ url }`。

**修复**：直接拼接访问 URL，不再调用该接口解析 JSON。

```ts
export function getMediaUrl(fileId: string): string {
  const baseUrl = (process.env.TARO_APP_API_BASE || '').replace(/\/+$/, '')
  return `${baseUrl}/api/media/${fileId}`
}
```

如需校验文件是否存在，可单独新增后端接口。

---

### 11. `uploadToOss` 使用相对路径

**文件**：`src/services/userService.ts:727`

**问题**：`Taro.uploadFile({ url: '/api/upload', ... })` 在真机可能丢失 baseUrl。

**修复**：

```ts
const baseUrl = (process.env.TARO_APP_API_BASE || '').replace(/\/+$/, '')
const res = await Taro.uploadFile({
  url: `${baseUrl}/api/upload`,
  filePath,
  name: 'file',
  header: authToken ? { Authorization: `Bearer ${authToken}` } : {},
})
```

---

### 12. `getCourseListExpanded` 返回类型错误

**文件**：`src/services/courseService.ts:23`

**问题**：后端返回 `PaginatedData<CourseListResponse>`，前端期望数组。

**修复**：

```ts
export async function getCourseListExpanded() {
  if (USE_MOCK) return courseList
  const res = await get<{ items: CourseBrief[] }>(`/api/courses`)
  return res.data?.items || []
}
```

---

### 13. `zoneService.getCertificationList` 期望 `items` 包装

**文件**：`src/services/zoneService.ts:171`

**问题**：后端 `/api/cert/certifications` 直接返回数组，不是 `{ items }`。

**修复**：

```ts
export async function getCertificationList(): Promise<CertificationResponse[]> {
  if (USE_MOCK) return []
  const res = await get<CertificationResponse[]>('/api/cert/certifications')
  return res.data || []
}
```

---

## 三、🟠 高优先级修复项（字段解析错误）

### 14. `getPointsBalance` 字段名错误

**文件**：`src/services/userService.ts:159`

后端返回 `{ balance }`，前端期望 `{ total, available }`。

**修复**：

```ts
export async function getPointsBalance() {
  if (USE_MOCK) return pointsBalance
  const res = await get<{ balance: number }>(`/api/points`)
  return { total: res.data?.balance ?? 0, available: res.data?.balance ?? 0 }
}
```

---

### 15. `getCompetitionStats` 响应结构错误

**文件**：`src/services/userService.ts:618`

后端返回 `CompetitionStatsItem[]`：`[{ school, count }, ...]`，前端期望 `{ total }`。

**修复**：

```ts
export async function getCompetitionStats(): Promise<{ total: number }> {
  if (USE_MOCK) return { total: 0 }
  const res = await get<Array<{ school: string; count: number }>>('/api/competition/stats')
  const items = res.data || []
  return { total: items.reduce((sum, item) => sum + item.count, 0) }
}
```

---

### 16. `validateCoupon` / `verifyCoupon` 响应结构错误

**文件**：`src/services/userService.ts:327、690`

后端返回完整 `CouponResponse`，不是 `{ valid, discount/message }`。

**修复**：

```ts
export async function validateCoupon(code: string): Promise<{ valid: boolean; discount?: number; message?: string }> {
  if (USE_MOCK) return { valid: code === 'MOCK100', discount: 100 }
  const res = await post<{
    id: number
    code: string
    type: string
    value: number
    min_order_amount: number
    valid_from: string | null
    valid_to: string | null
    status: string
    used_at: string | null
  }>('/api/coupons/validate', { coupon_code: code })
  const c = res.data
  const valid = c.status === 'unused' && (!c.valid_to || new Date(c.valid_to) > new Date())
  return {
    valid,
    discount: valid ? c.value : undefined,
    message: valid ? undefined : '优惠券无效或已过期',
  }
}
```

---

### 17. `getWrongBook` 读取不存在的 `wrong_count`

**文件**：`src/services/quizService.ts:136`

后端 `QuizRecordQuestionResponse` 无 `wrong_count` 字段。

**修复**：删除该字段，或让后端在错题记录中补充。

```ts
return items.map(item => ({
  ...toQuizQuestion(item.question),
  recordId: item.id,
  wrongDate: (item.updated_at as string)?.slice(0, 10) ?? '',
  // wrongCount 后端暂无，先固定为 1 或移除
  wrongCount: 1,
}))
```

---

### 18. `getQuizProgress` 字段名不匹配

**文件**：`src/services/quizService.ts:280`

后端返回 `QuizProgressItem`：`{ category_id, category_name, total, answered, correct, accuracy }`。

前端读取 `total_answers / correct_answers / answered_questions / completion_rate ...`。

**修复**：

```ts
export async function getQuizProgress(categoryId: string): Promise<QuizStats> {
  // ...
  return {
    totalAnswers: (data.answered as number) ?? 0,
    correctAnswers: (data.correct as number) ?? 0,
    accuracy: (data.accuracy as number) ?? 0,
    totalQuestions: (data.total as number) ?? 0,
    answeredQuestions: (data.answered as number) ?? 0,
    completionRate: data.total ? Number(((data.answered as number ?? 0) / data.total).toFixed(2)) : 0,
    streakDays: 0,
    totalCheckinDays: 0,
    wrongCount: 0,
    collectedCount: 0,
    todayAnswers: 0,
    todayCorrect: 0,
  }
}
```

---

### 19. `fetchQuickQuestions` 响应类型错误

**文件**：`src/services/userService.ts:753`

后端返回对象数组 `{ id, question_text, category }[]`，前端期望 `string[]`。

**修复**：

```ts
export async function fetchQuickQuestions(): Promise<string[]> {
  if (USE_MOCK) return quickQuestions
  const res = await get<Array<{ id: number; question_text: string; category?: string }>>('/api/quick-questions')
  return (res.data || []).map(q => q.question_text)
}
```

---

### 20. `getQuizQuestions` 参数类型与分页

**文件**：`src/services/quizService.ts:123`

- `category_id` 前端传 `string`，后端要求 `int`
- 未传分页参数，默认只返回 20 条

**修复**：

```ts
export async function getQuizQuestions(categoryId?: string, page = 1, pageSize = 100) {
  if (USE_MOCK) { /* ... */ }
  const params: Record<string, unknown> = { page, page_size: pageSize }
  if (categoryId) params.category_id = Number(categoryId)
  const res = await get<{ items?: QuizQuestionResponse[] }>('/api/quiz/questions', params)
  // ...
}
```

---

## 四、🟡 中优先级修复项（隐患/数据不全）

### 21. `getPoster` 需要登录，但用于登录页

**文件**：`src/services/userService.ts:716`

后端 `GET /api/system/poster` 依赖 `get_current_user`。

**修复建议**：
- 方案 A：后端改为 `get_current_user_optional`
- 方案 B：前端在登录成功后获取并缓存海报

---

### 22. `CourseDetail` 类型缺失后端字段

**文件**：`src/types/course.ts:49`

后端 `CourseDetailResponse` 还返回 `has_access, enrollment_id, chapters, free_preview_seconds`。

**修复**：

```ts
export interface CourseDetail {
  id: number
  title: string
  category: string
  description: string | null
  cover_url: string | null
  video_url: string | null
  price: number
  batches: Record<string, unknown> | null
  teacher_name: string | null
  teacher_contact: string | null
  has_access: boolean
  enrollment_id: number | null
  chapters: Array<{ id: number; title: string; video_url: string | null; duration: number | null; sort_order: number }>
  free_preview_seconds: number | null
}
```

---

### 23. `getMyCourses` 状态映射不全

**文件**：`src/services/courseService.ts:78`

后端 `EnrollmentStatus`：`pending_payment | enrolled | completed | refunded | cancelled | expired`。

**修复**：

```ts
function mapEnrollmentStatus(status: string): 'active' | 'expired' | 'pending' | 'completed' | 'cancelled' {
  switch (status) {
    case 'enrolled':
    case 'completed':
      return 'active'
    case 'expired':
      return 'expired'
    case 'pending_payment':
      return 'pending'
    case 'refunded':
    case 'cancelled':
      return 'cancelled'
    default:
      return 'pending'
  }
}
```

---

### 24. Level-2 资料提交字段必填校验

**文件**：`src/services/userService.ts:764、790、820`

后端 `RealnameSubmit / StudentSubmit / EnterpriseSubmit` 多个字段为必填，但前端 `update*` 方法把这些字段标为可选。

**修复建议**：
- 提交前做完整表单校验；或
- 与后端确认更新接口是否应独立为 `PUT`，并支持部分字段更新。

---

### 25. `getAgreements` 状态枚举假设

**文件**：`src/services/userService.ts:187`

前端用 `item.status !== 'pending_sign'` 判断签署时间，需确认后端 `AgreementResponse.status` 实际枚举值。

**修复**：与后端确认后统一枚举，例如：

```ts
signedAt: item.status === 'signed' ? item.updated_at || undefined : undefined,
```

---

### 26. `IdentityInfo.created_at` 后端不存在

**文件**：`src/services/authService.ts:14`

后端 `RealnameResponse` 无 `created_at` 字段。

**修复**：从 `IdentityInfo` 类型中移除 `created_at: string`，或让后端补充。

---

### 27. ID 类型统一

**文件**：多处（quiz、orders、courses 等）

前端把后端 `int` ID 转成 `string`，传回时仍是字符串。FastAPI 能自动转换数字字符串，但非数字会 422。

**修复**：所有需要传给后端的 ID 参数统一 `Number(id)`。

---

## 五、后端已提供但前端未对接的能力

以下接口后端已就绪，建议按业务需求逐步接入：

| 能力 | 后端接口 | 前端现状 |
|------|----------|----------|
| 课程购买 | `POST /api/courses/{id}/purchase` | 仍用旧 `/api/courses/enroll` |
| 课程章节/进度 | `GET /api/courses/{id}/chapters`<br>`GET/POST /api/courses/{id}/progress` | 未调用 |
| 课程内容/资源 | `GET /api/courses/{id}/content`<br>`GET /api/course-assets/{id}/content` | 未调用 |
| 模拟考试 | `POST /api/quiz/exam/start`<br>`POST /api/quiz/exam/submit` | 未调用 |
| 近期答题记录 | `GET /api/quiz/recent` | 未调用 |
| H3C 报名 | `GET /api/orders/h3c/profile`<br>`POST /api/orders/h3c` | 未调用 |
| 认证批次 | `GET /api/plans?product_type=xxx` | 未调用 |
| 培训列表 | `GET /api/training` | 未调用 |

---

## 六、建议修复顺序

1. **第一阶段（严重，影响主流程）**
   - `createOrder` 字段改造
   - 订单 `cert_type` → `product_type`
   - `registerActivity` 路径修复
   - `removeFavorite` / `removeCollection` 删除逻辑
   - `uploadToOss` 相对路径
   - `getMediaUrl` 不再当 JSON 解析

2. **第二阶段（高，影响展示/计算）**
   - 积分余额字段
   - 竞赛统计
   - 优惠券验证响应
   - 错题本 `wrongCount`
   - 题库进度字段映射
   - 快问响应类型

3. **第三阶段（中 + 新能力）**
   - 登录海报鉴权
   - 课程详情字段扩展
   - 课程购买/章节/进度对接
   - 模拟考试对接
   - H3C 报名对接

---

## 七、附：后端接口速查

详见同目录下子代理扫描结果，关键前缀：

- 主接口：`/api/*`
- 管理后台：`/api/admin/*`
- 统一响应：`{ code: 0, data: T, message: "ok" }`
- 分页响应：`{ items: T[], total, page, page_size }`
- 认证方式：`Authorization: Bearer {token}`
