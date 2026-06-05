# 前后端 API 对接情况

> 扫描日期：2026-06-05
> 范围：Backend (`/api/*`) ↔ Platform (`dataService.ts`)

---

## 一、总览

| 维度 | 数量 |
|------|------|
| Backend `/api/*` 端点总数 | ~62 |
| Platform `dataService.ts` 调用点 | 36 |
| 路径正确对接 | 28 |
| 路径不匹配（含缺失） | 5 |
| 参数不匹配 | 8 |
| Backend 独有（Platform 未调用） | ~30 |

---

## 二、路径不匹配 / 缺失端点（阻塞级）

### 🔴 1. Agreements 路径前缀缺失

Backend 在 `main.py` 中直接注册了 agreement router，**未挂载到 `/api` 前缀下**：

```
Backend 实际路径:
  GET    /agreements
  POST   /agreements
  PUT    /agreements/{agreement_id}/sign

Platform 调用路径:
  GET    /api/agreements
  POST   /api/agreements
  PUT    /api/agreements/{id}/sign
```

**影响函数**: `getAgreements()` / `createAgreement()` / `signAgreement()`

**修复建议**: Backend 将 agreement router 挂入 api_router（加上 `/api` 前缀），或 Platform 去掉 `/api`。

---

### 🔴 2. 缺失端点 — `POST /api/verification/send`

Platform 调用 `sendVerificationCode(phone)` 请求 `POST /api/verification/send`，Backend 无此端点。

> Backend 有一个语义相近的端点 `GET /api/cert/sangfor/verify-code`，但方法不同、路径不同、参数也不同。

**影响函数**: `sendVerificationCode()`

**修复建议**: 新增端点或调整 Platform 调用现有端点。

---

### 🔴 3. 缺失端点 — `GET /api/user/exam-intentions`

**影响函数**: `getExamIntentions()`

**修复建议**: Backend 新增此端点。

---

### 🔴 4. 缺失端点 — `GET /api/user/teachers`

**影响函数**: `getTeacherContacts()`

**修复建议**: Backend 新增此端点。

---

### 🔴 5. 缺失端点 — `GET /api/user/exams`

**影响函数**: `getRegisteredExams()`

**修复建议**: Backend 新增此端点。

---

## 三、参数不匹配（运行时报错级）

### 🟡 1. `prepayOrder` — order_id 类型不一致

| 方向 | 字段 |
|------|------|
| Platform 发送 | `{ order_id: string }` |
| Backend 期望 | `order_id: int` (PaymentPrepayRequest) |

**修复建议**: Platform 将 `order_id` 改为 `number` 类型。

---

### 🟡 2. `submitQuizAnswer` — 字段名与语义完全不同

| 方向 | 字段 |
|------|------|
| Platform 发送 | `{ question_id: string, answer: number\|number[], is_correct: boolean }` |
| Backend 期望 | `{ question_id: int, user_answer: str }` (QuizSubmitRequest) |

差异点：
- 字段名 `answer` → 应为 `user_answer`
- `question_id` 类型 `string` → 应为 `int`
- `is_correct` 前端自行判定传入，但 Backend 不需要此字段（正确性由后端判定）

**修复建议**: 对齐字段名和类型，去掉前端 `is_correct` 字段。

---

### 🟡 3. `addFavorite` — question_id 类型不一致

| 方向 | 字段 |
|------|------|
| Platform 发送 | `{ question_id: string }` |
| Backend 期望 | `{ question_id: int }` (QuizCollectionRequest) |

**修复建议**: Platform `question_id` → `number`。

---

### 🟡 4. `removeFavorite` — 路径参数类型不一致

| 方向 | 参数 |
|------|------|
| Platform 发送 | `DELETE /api/quiz/collections/{questionId}` (string) |
| Backend 期望 | `id: int` (路径参数) |

**修复建议**: Platform 将 `questionId` 改为 `number`。

---

### 🟡 5. `submitCheckin` — 缺少必填 body

| 方向 | 字段 |
|------|------|
| Platform 发送 | 无 body（空 POST） |
| Backend 期望 | `{ questions_completed: int }` (QuizCheckinRequest) |

**修复建议**: Platform 传 `{ questions_completed: N }`。

---

### 🟡 6. `validateCoupon` — 字段名不一致

| 方向 | 字段 |
|------|------|
| Platform 发送 | `{ code: string }` |
| Backend 期望 | `{ coupon_code: string }` (CouponVerifyRequest) |

**修复建议**: Platform 改 `code` → `coupon_code`。

---

### 🟡 7. `signupCompetition` — Schema 完全不同

| 方向 | 字段 |
|------|------|
| Platform 发送 | `{ competition_id: number }` |
| Backend 期望 | `{ competition_name: str, school: str, track?: str }` (CompetitionSignupRequest) |

Platform 设计为「按 ID 加入已有竞赛」，Backend 设计为「提交完整竞赛报名信息」，语义模型不同。

**修复建议**: 双方对齐语义 —— 选其一作为标准，另一端适配。

---

### 🟡 8. `enrollActivity` — 缺少报名人信息

| 方向 | 字段 |
|------|------|
| Platform 发送 | 无 body |
| Backend 期望 | `{ name: str, phone: str, remark?: str }` (ActivityRegisterRequest, body 可选) |

Backend body 设计为可选（`None`），但 `name`/`phone` 为空字符串可能导致业务记录异常。

**修复建议**: Platform 补充报名人姓名和电话参数。

---

## 四、正确对接的端点（28 个）

| # | 方法 | Backend 端点 | Platform 函数 |
|---|------|-------------|--------------|
| 1 | GET | `/api/zones` | `getHomeAggregation()` |
| 2 | GET | `/api/zones/cert` | `getCertZone()` |
| 3 | GET | `/api/zones/study` | `getStudyZone()` |
| 4 | GET | `/api/zones/competition` | `getCompetitionZone()` |
| 5 | GET | `/api/zones/activity` | `getActivityZone()` |
| 6 | GET | `/api/zones/employment` | `getEmploymentZone()` |
| 7 | GET | `/api/courses` | `getCourseList()` / `getCourseListExpanded()` |
| 8 | GET | `/api/courses/categories` | `getCourseCategories()` |
| 9 | GET | `/api/courses/{id}` | `getCourseById()` |
| 10 | GET | `/api/cert/certifications` | `getCertifications()` |
| 11 | GET | `/api/cert/certifications/{id}` | `getCertDetail()` |
| 12 | GET | `/api/cert/certifications/tags` | `getRegistrationTagFilters()` |
| 13 | GET | `/api/quiz/categories` | `getQuizCategories()` |
| 14 | GET | `/api/quiz/questions` | `getQuizQuestions()` |
| 15 | GET | `/api/quiz/wrong-book` | `getWrongBook()` |
| 16 | GET | `/api/quiz/collections` | `getFavoriteQuestions()` |
| 17 | GET | `/api/quiz/checkin` | `getCheckinRecords()` |
| 18 | GET | `/api/courses/my` | `getMyCourses()` |
| 19 | GET | `/api/orders` | `getOrders()` |
| 20 | GET | `/api/orders/{id}` | `getOrderDetail()` |
| 21 | GET | `/api/points` | `getPointsBalance()` |
| 22 | GET | `/api/points/history` | `getPointRecords()` |
| 23 | GET | `/api/user/profile` | `getUserProfile()` |
| 24 | GET | `/api/coupons` | `getCoupons()` |
| 25 | GET | `/api/tickets` | `getTickets()` |
| 26 | POST | `/api/orders` | `createOrder()` |
| 27 | POST | `/api/chat` | `sendChatMessage()` |
| 28 | POST | `/api/upload` | `uploadFile()` |
| 29 | PUT | `/api/user/profile` | `updateUserProfile()` |
| 30 | POST | `/api/jobs/{id}/apply` | `applyJob()` |
| 31 | POST | `/api/activities/{id}/enroll` | `enrollActivity()` * |
| 32 | POST | `/api/activities/{id}/remind` | `remindActivity()` |
| 33 | POST | `/api/competition/signup` | `signupCompetition()` * |
| 34 | GET | `/api/collections` | `getMyCollections()` |

> `*` 路径正确但参数不匹配，详见第三章。

---

## 五、Backend 独有端点（Platform 未对接）

以下端点 Backend 已实现，但 Platform 前端尚未调用：

### 认证
- `POST /api/auth/login` — 微信 code 登录
- `POST /api/auth/refresh` — 刷新 token
- `POST /api/auth/logout` — 退出登录

### 用户
- `DELETE /api/user/account` — 注销账号
- `POST /api/user/phone/decrypt` — 解密微信手机号
- `POST /api/user/identity` — 提交实名认证
- `GET /api/user/identity` — 查询实名状态
- `POST /api/user/unbind` — 解绑手机号/微信

### 课程
- `POST /api/courses/enroll` — 课程报名

### 题库
- `POST /api/quiz/wrong-book` — 加入错题本（写操作）
- `DELETE /api/quiz/wrong-book/{id}` — 移出错题本

### 认证（深信服 / NISP / 导出）
- `GET /api/cert/sangfor/coupons` — 深信服考试券列表
- `GET /api/cert/sangfor/verify-code` — 动态验证码下发
- `GET /api/cert/nisp/pinyin` — 拼音生成
- `GET /api/cert/nisp/template` — NISP 模板文件
- `GET /api/cert/export` — 认证报名导出 CSV

### 订单 / 支付
- `POST /api/payment/callback` — 微信支付回调（服务端回调，无需前端对接）

### 积分
- `POST /api/points/claim` — 领取积分
- `POST /api/points/redeem` — 积分兑换

### 价格
- `GET /api/prices` — 价格配置列表

### 收藏（通用收藏）
- `POST /api/collections` — 添加收藏
- `DELETE /api/collections/{id}` — 取消收藏

### 活动
- `GET /api/activities` — 活动列表（独立）
- `POST /api/activities/register` — 活动报名（主端点）
- `GET /api/activities/export` — 导出报名 CSV

### 竞赛
- `GET /api/competition/stats` — 按学校统计
- `GET /api/competition/tracks` — 赛道列表
- `GET /api/competition/export` — 导出报名 CSV

### 岗位
- `GET /api/jobs` — 岗位列表

### 工单
- `POST /api/tickets` — 创建工单
- `GET /api/tickets/{id}` — 工单详情

### 分享
- `POST /api/share` — 生成分享链接
- `GET /api/share/{code}` — 分享追踪

### 媒体
- `GET /api/media/{file_id}` — 访问/下载文件

### 优惠券
- `POST /api/coupons/assign` — 下发优惠券
- `POST /api/coupons/verify` — 核销优惠券

### 客服
- `GET /api/quick-questions` — 推荐问题列表
- `GET /api/chat/stream` — SSE 流式消息

### 系统
- `GET /api/system/poster` — 登录海报
- `POST /api/system/upload` — 文件上传 OSS（mock）
- `GET /api/system/media/{media_id}` — 文件访问 URL（mock）

---

## 六、修复优先级

### P0 — 阻塞上线

| 问题 | 修复方向 |
|------|---------|
| Agreements 路径前缀 | Backend 将 agreement router 挂入 `/api` 前缀 |
| `submitCheckin` 缺 body | Platform 传 `{ questions_completed: N }` |
| `validateCoupon` 字段名 | Platform 改 `code` → `coupon_code` |
| 4 个缺失端点 | Backend 新增 `/api/user/exam-intentions` 等 |

### P1 — 功能异常

| 问题 | 修复方向 |
|------|---------|
| `submitQuizAnswer` schema | 统一字段名 `answer`→`user_answer`，去掉 `is_correct` |
| `signupCompetition` schema | 语义对齐：按 ID 报名 vs 完整信息 |
| `enrollActivity` 缺参数 | Platform 补充 `name`/`phone` |

### P2 — 类型兜底

| 问题 | 修复方向 |
|------|---------|
| `prepayOrder` order_id 类型 | Platform `string` → `number` |
| `addFavorite/removeFavorite` id 类型 | Platform `string` → `number` |

---

## 七、请求工具说明

Platform 使用 `@/utils/request.ts` 统一封装，通过 `Taro.request` 发起请求，特性：

- `BASE_URL` 由环境变量 `TARO_APP_API_BASE` 决定，默认为空
- 自动注入 `Authorization: Bearer <token>` header
- 统一解析 `{ code: 0, data: T, message: string }` 响应
- `code === 401` 时自动清除 token 并跳转登录页
- `dataService.ts` 中 `USE_MOCK = false` 时走真实 API

Backend 响应格式：`APIResponse[T]` = `{ code: int, data: T, message: str }`，`code=0` 表示成功。
