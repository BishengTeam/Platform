# 前后端 API 对接情况

> 扫描日期：2026-06-06
> 范围：Backend (`app/api/*` + `app/main.py`) ↔ Platform (`src/services/*.ts`)

---

## 一、总览

| 维度 | 数量 |
|------|------|
| Backend `/api/*` 端点总数 | 78 |
| Backend 非 `/api` 端点（agreement + health） | 5 |
| Platform `service/*.ts` 调用点 | 79 |
| 路径正确对接 | 76 |
| 路径不匹配（Agreements 前缀缺失） | 3 |
| 参数不匹配 | 10 |
| Backend 独有（Platform 未调用） | 2 |

---

## 二、路径不匹配 / 缺失端点（阻塞级）

### 🔴 1. Agreements 路径前缀缺失

Backend 在 `main.py` 中将 `agreement_router` 直接注册到 `app`，**未挂载到 `/api` 前缀下**：

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

**修复建议**: Backend 将 agreement router 挂入 `api_router`（加上 `/api` 前缀），或 Platform 去掉路径中的 `/api`。

---

## 三、参数不匹配（运行时报错级）

### 🟡 1. `submitQuizAnswer` — 字段名与语义完全不同

| 方向 | 字段 |
|------|------|
| Platform 发送 | `{ question_id: string, answer: number\|number[], is_correct: boolean }` |
| Backend 期望 | `{ question_id: int, user_answer: str }` (QuizSubmitRequest) |

差异点：
- 字段名 `answer` → 应为 `user_answer`
- `question_id` 类型 `string` → 应为 `int`
- `is_correct` 前端自行判定传入，Backend 不需要此字段（正确性由后端判定）

**影响函数**: `submitQuizAnswer()`

**修复建议**: 对齐字段名和类型，去掉前端 `is_correct` 字段。

---

### 🟡 2. `signupCompetition` — Schema 完全不同

| 方向 | 字段 |
|------|------|
| Platform 发送 | `{ competition_id: number }` |
| Backend 期望 | `{ competition_name: str, school: str, track?: str }` (CompetitionSignupRequest) |

Platform 设计为「按 ID 加入已有竞赛」，Backend 设计为「提交完整竞赛报名信息」，语义模型不同。

**影响函数**: `signupCompetition()`

**修复建议**: 双方对齐语义 —— 选其一作为标准，另一端适配。

---

### 🟡 3. `enrollActivity` — 缺少报名人信息

| 方向 | 字段 |
|------|------|
| Platform 发送 | 无 body |
| Backend 期望 | `{ name: str, phone: str, remark?: str }` (ActivityRegisterRequest, body 可选) |

Backend body 设计为可选（`None`），但 `name`/`phone` 为空字符串可能导致业务记录异常。

> 注：Platform 另有 `registerActivity()` 函数调用 `POST /api/activities/register`，该函数传递了完整的 `{ activity_id, name, phone, remark }`，是正确的。

**影响函数**: `enrollActivity()`

**修复建议**: Platform 补充报名人姓名和电话参数，或改为调用 `registerActivity()`。

---

### 🟡 4. `validateCoupon` — 字段名不一致

| 方向 | 字段 |
|------|------|
| Platform `validateCoupon()` 发送 | `{ code: string }` |
| Backend 期望 | `{ coupon_code: string }` (CouponVerifyRequest) |

> 注：Platform 另有 `verifyCoupon()` 函数，使用正确的字段名 `coupon_code`。`validateCoupon()` 是旧版函数。

**影响函数**: `validateCoupon()`

**修复建议**: 将 `code` → `coupon_code`，或统一使用 `verifyCoupon()`。

---

### 🟡 5. `prepayOrder` — order_id 类型不一致

| 方向 | 字段 |
|------|------|
| Platform 发送 | `{ order_id: string }` |
| Backend 期望 | `order_id: int` (PaymentPrepayRequest) |

**影响函数**: `prepayOrder()`

**修复建议**: Platform 将 `orderId` 参数类型从 `string` 改为 `number`。

---

### 🟡 6. `getNispPinyin` — 参数名不一致

| 方向 | 参数 |
|------|------|
| Platform 发送 | `GET /api/cert/nisp/pinyin?text=...` |
| Backend 期望 | `name: str` (Query) |

**影响函数**: `getNispPinyin()`

**修复建议**: Platform 将查询参数 `text` → `name`。

---

### 🟡 7. `createTicket` — 字段名不一致

| 方向 | 字段 |
|------|------|
| Platform 发送 | `{ title: string, description: string, type?: string }` |
| Backend 期望 | `{ content: str }` (TicketCreateRequest) |

**影响函数**: `createTicket()`

**修复建议**: Platform 将 `title`/`description` 合并为 `content`，或 Backend 扩展 schema。

---

### 🟡 8. `addCollection` / `createShare` — 字段名不一致

| 方向 | 字段 |
|------|------|
| Platform `addCollection()` 发送 | `{ type: string, target_id: number }` |
| Platform `createShare()` 发送 | `{ type: string, target_id: number }` |
| Backend 期望 | `{ target_type: str, target_id: int }` (CollectionCreate / ShareCreateRequest) |

**影响函数**: `addCollection()` / `createShare()`

**修复建议**: Platform 将 `type` → `target_type`。

---

### 🟡 9. `assignCoupon` — 字段名不一致

| 方向 | 字段 |
|------|------|
| Platform 发送 | `{ coupon_id?: string, user_id?: string }` |
| Backend 期望 | `{ coupon_code: str }` (CouponAssignRequest) |

**影响函数**: `assignCoupon()`

**修复建议**: Platform 将 `coupon_id` → `coupon_code`，去掉 `user_id`（由 token 解析）。

---

### 🟡 10. `getCourseById` — 路径参数类型不一致

| 方向 | 参数 |
|------|------|
| Platform 发送 | `GET /api/courses/{id}` (id: string) |
| Backend 期望 | `course_id: int` (Path) |

TS 的 `string` 在 URL 拼接时会被转换，但类型签名不一致。

**影响函数**: `getCourseById()`

**修复建议**: Platform 将参数类型从 `string` 改为 `number`。

---

## 四、正确对接的端点

### Zone 专区聚合（6 个）
| # | 方法 | Backend 端点 | Platform 函数 |
|---|------|-------------|--------------|
| 1 | GET | `/api/zones` | `getHomeAggregation()` |
| 2 | GET | `/api/zones/cert` | `getCertZone()` |
| 3 | GET | `/api/zones/study` | `getStudyZone()` |
| 4 | GET | `/api/zones/competition` | `getCompetitionZone()` |
| 5 | GET | `/api/zones/activity` | `getActivityZone()` |
| 6 | GET | `/api/zones/employment` | `getEmploymentZone()` |

### 课程（5 个）
| # | 方法 | Backend 端点 | Platform 函数 |
|---|------|-------------|--------------|
| 7 | GET | `/api/courses` | `getCourseList()` / `getCourseListExpanded()` |
| 8 | GET | `/api/courses/categories` | `getCourseCategories()` |
| 9 | GET | `/api/courses/{id}` | `getCourseById()` * |
| 10 | GET | `/api/courses/my` | `getMyCourses()` |
| 11 | POST | `/api/courses/enroll` | `enrollCourse()` |

> `*` 参数类型不一致，详见第三章。

### 认证项目（7 个）
| # | 方法 | Backend 端点 | Platform 函数 |
|---|------|-------------|--------------|
| 12 | GET | `/api/cert/certifications` | `getCertifications()` |
| 13 | GET | `/api/cert/certifications/{id}` | `getCertDetail()` |
| 14 | GET | `/api/cert/certifications/tags` | `getRegistrationTagFilters()` |
| 15 | GET | `/api/cert/sangfor/coupons` | `getSangforCoupons()` |
| 16 | GET | `/api/cert/sangfor/verify-code` | `getSangforVerifyCode()` |
| 17 | GET | `/api/cert/nisp/pinyin` | `getNispPinyin()` * |
| 18 | GET | `/api/cert/nisp/template` | `getNispTemplate()` |

> `*` 参数名不一致，详见第三章。

### 题库（11 个）
| # | 方法 | Backend 端点 | Platform 函数 |
|---|------|-------------|--------------|
| 19 | GET | `/api/quiz/categories` | `getQuizCategories()` |
| 20 | GET | `/api/quiz/questions` | `getQuizQuestions()` |
| 21 | GET | `/api/quiz/wrong-book` | `getWrongBook()` |
| 22 | GET | `/api/quiz/collections` | `getFavoriteQuestions()` |
| 23 | GET | `/api/quiz/checkin` | `getCheckinRecords()` |
| 24 | POST | `/api/quiz/submit` | `submitQuizAnswer()` * |
| 25 | POST | `/api/quiz/wrong-book` | `addWrongBook()` |
| 26 | DELETE | `/api/quiz/wrong-book/{id}` | `removeWrongBook()` |
| 27 | POST | `/api/quiz/collections` | `addFavorite()` |
| 28 | DELETE | `/api/quiz/collections/{id}` | `removeFavorite()` |
| 29 | POST | `/api/quiz/checkin` | `submitCheckin()` |

> `*` schema 不一致，详见第三章。

### 认证（登录/用户）（8 个）
| # | 方法 | Backend 端点 | Platform 函数 |
|---|------|-------------|--------------|
| 30 | POST | `/api/auth/login` | `wxLogin()` |
| 31 | POST | `/api/auth/refresh` | `refreshToken()` |
| 32 | POST | `/api/auth/logout` | `logout()` |
| 33 | DELETE | `/api/user/account` | `deleteAccount()` |
| 34 | POST | `/api/user/phone/decrypt` | `decryptPhone()` |
| 35 | POST | `/api/user/identity` | `submitIdentity()` |
| 36 | GET | `/api/user/identity` | `getIdentityStatus()` |
| 37 | POST | `/api/user/unbind` | `unbindAccount()` |

### 订单 / 支付（4 个）
| # | 方法 | Backend 端点 | Platform 函数 |
|---|------|-------------|--------------|
| 38 | POST | `/api/orders` | `createOrder()` |
| 39 | GET | `/api/orders` | `getOrders()` / `getRegisteredExams()` |
| 40 | GET | `/api/orders/{id}` | `getOrderDetail()` |
| 41 | POST | `/api/payment/prepay` | `prepayOrder()` * |

> `*` 参数类型不一致，详见第三章。

### 用户资料 / 积分（4 个）
| # | 方法 | Backend 端点 | Platform 函数 |
|---|------|-------------|--------------|
| 42 | GET | `/api/user/profile` | `getUserProfile()` |
| 43 | PUT | `/api/user/profile` | `updateUserProfile()` |
| 44 | GET | `/api/points` | `getPointsBalance()` |
| 45 | GET | `/api/points/history` | `getPointRecords()` |

### 积分扩展 / 价格（3 个）
| # | 方法 | Backend 端点 | Platform 函数 |
|---|------|-------------|--------------|
| 46 | POST | `/api/points/claim` | `claimPoints()` |
| 47 | POST | `/api/points/redeem` | `redeemPoints()` |
| 48 | GET | `/api/prices` | `getPrices()` |

### 活动 / 竞赛 / 岗位（8 个）
| # | 方法 | Backend 端点 | Platform 函数 |
|---|------|-------------|--------------|
| 49 | GET | `/api/activities` | `getActivities()` |
| 50 | POST | `/api/activities/register` | `registerActivity()` |
| 51 | POST | `/api/activities/{id}/enroll` | `enrollActivity()` * |
| 52 | POST | `/api/activities/{id}/remind` | `remindActivity()` |
| 53 | GET | `/api/competition/stats` | `getCompetitionStats()` |
| 54 | GET | `/api/competition/tracks` | `getCompetitionTracks()` |
| 55 | POST | `/api/competition/signup` | `signupCompetition()` * |
| 56 | POST | `/api/jobs/{id}/apply` | `applyJob()` |

> `*` 参数不匹配，详见第三章。

### 收藏 / 优惠券 / 工单（9 个）
| # | 方法 | Backend 端点 | Platform 函数 |
|---|------|-------------|--------------|
| 57 | GET | `/api/collections` | `getMyCollections()` |
| 58 | POST | `/api/collections` | `addCollection()` * |
| 59 | DELETE | `/api/collections/{id}` | `removeCollection()` |
| 60 | GET | `/api/coupons` | `getCoupons()` |
| 61 | POST | `/api/coupons/assign` | `assignCoupon()` * |
| 62 | POST | `/api/coupons/validate` | `validateCoupon()` * / `verifyCoupon()` |
| 63 | GET | `/api/tickets` | `getTickets()` |
| 64 | POST | `/api/tickets` | `createTicket()` * |
| 65 | GET | `/api/tickets/{id}` | `getTicketDetail()` |

> `*` 参数不匹配，详见第三章。

### 客服 / 分享 / 媒体（7 个）
| # | 方法 | Backend 端点 | Platform 函数 |
|---|------|-------------|--------------|
| 66 | POST | `/api/chat` | `sendChatMessage()` |
| 67 | GET | `/api/chat/stream` | `streamChatMessage()` |
| 68 | GET | `/api/quick-questions` | `fetchQuickQuestions()` |
| 69 | POST | `/api/share` | `createShare()` * |
| 70 | GET | `/api/share/{code}` | `getShareInfo()` |
| 71 | POST | `/api/upload` | `uploadFile()` / `uploadToOss()` |
| 72 | GET | `/api/media/{file_id}` | `getMediaUrl()` |

> `*` 参数不匹配，详见第三章。

### 系统 / 岗位列表（3 个）
| # | 方法 | Backend 端点 | Platform 函数 |
|---|------|-------------|--------------|
| 73 | GET | `/api/system/poster` | `getPoster()` |
| 74 | GET | `/api/system/media/{media_id}` | `getSystemMediaUrl()` |
| 75 | POST | `/api/system/upload` | `uploadToOss()` (调用 `/api/upload`) |
| 76 | GET | `/api/jobs` | `getJobs()` |

---

## 五、Backend 独有端点（Platform 未对接）

以下端点 Backend 已实现，但 Platform 前端尚未调用：

### 支付（服务端回调，无需前端对接）
- `POST /api/payment/callback` — 微信支付回调

### 优惠券（Platform 使用 `/validate` 别名代替）
- `POST /api/coupons/verify` — 核销优惠券主端点

> Backend 同时提供了 `/verify`（主端点）和 `/validate`（兼容别名），Platform 使用 `/validate`。

### 未对接但 Backend 已实现
无。所有 Backend `/api/*` 端点（除 `payment/callback` 和 `coupons/verify` 外）Platform 均已对接。

---

## 六、已修复项（对比上期 2026-06-05 报告）

| 问题 | 状态 |
|------|------|
| `submitCheckin` 缺 body | ✅ Platform 现在发送 `{ questions_completed: 1 }` |
| `addFavorite` question_id 类型 `string` | ✅ 已改为 `number` |
| `removeFavorite` 路径参数类型 `string` | ✅ 已改为 `number` |
| 缺失端点 `GET /api/user/exam-intentions` | ✅ Platform 已移除该调用 |
| 缺失端点 `GET /api/user/teachers` | ✅ Platform 已移除该调用 |
| `getRegisteredExams()` 缺失端点 | ✅ 改用 `GET /api/orders?status=paid` 代理 |
| `verifyCoupon()` 字段名 | ✅ 新函数使用正确字段名 `coupon_code` |

---

## 七、修复优先级

### P0 — 阻塞上线

| 问题 | 修复方向 |
|------|---------|
| Agreements 路径前缀 | Backend 将 agreement router 挂入 `/api` 前缀 |

### P1 — 功能异常

| 问题 | 修复方向 |
|------|---------|
| `submitQuizAnswer` schema | 统一字段名 `answer`→`user_answer`，去掉 `is_correct` |
| `signupCompetition` schema | 语义对齐：按 ID 报名 vs 完整信息 |
| `validateCoupon` 字段名 | 改 `code` → `coupon_code`，或统一用 `verifyCoupon()` |
| `getNispPinyin` 参数名 | 改 `text` → `name` |
| `createTicket` schema | 改 `title`/`description` → `content` |
| `addCollection` / `createShare` 字段名 | 改 `type` → `target_type` |
| `assignCoupon` schema | 改 `coupon_id` → `coupon_code` |

### P2 — 类型兜底

| 问题 | 修复方向 |
|------|---------|
| `prepayOrder` order_id 类型 | Platform `string` → `number` |
| `getCourseById` id 类型 | Platform `string` → `number` |
| `enrollActivity` 缺参数 | Platform 补充 `name`/`phone`（或改用 `registerActivity`） |

---

## 八、请求工具说明

Platform 使用 `@/utils/request.ts` 统一封装，通过 `Taro.request` 发起请求，特性：

- `BASE_URL` 由环境变量 `TARO_APP_API_BASE` 决定，默认为空
- 自动注入 `Authorization: Bearer <token>` header
- 统一解析 `{ code: 0, data: T, message: string }` 响应
- `code === 401` 时自动清除 token 并跳转登录页
- 各 service 文件通过 `USE_MOCK = false` 控制 mock/API 双模切换

Backend 响应格式：`APIResponse[T]` = `{ code: int, data: T, message: str }`，`code=0` 表示成功。

---

## 附录：完整端点对照表

| Backend 端点 | 方法 | Platform 函数 | 状态 |
|-------------|------|--------------|------|
| `/api/zones` | GET | `getHomeAggregation()` | ✅ |
| `/api/zones/cert` | GET | `getCertZone()` | ✅ |
| `/api/zones/study` | GET | `getStudyZone()` | ✅ |
| `/api/zones/competition` | GET | `getCompetitionZone()` | ✅ |
| `/api/zones/activity` | GET | `getActivityZone()` | ✅ |
| `/api/zones/employment` | GET | `getEmploymentZone()` | ✅ |
| `/api/courses` | GET | `getCourseList()` | ✅ |
| `/api/courses/categories` | GET | `getCourseCategories()` | ✅ |
| `/api/courses/{id}` | GET | `getCourseById()` | 🟡 |
| `/api/courses/my` | GET | `getMyCourses()` | ✅ |
| `/api/courses/enroll` | POST | `enrollCourse()` | ✅ |
| `/api/cert/certifications` | GET | `getCertifications()` | ✅ |
| `/api/cert/certifications/{id}` | GET | `getCertDetail()` | ✅ |
| `/api/cert/certifications/tags` | GET | `getRegistrationTagFilters()` | ✅ |
| `/api/cert/sangfor/coupons` | GET | `getSangforCoupons()` | ✅ |
| `/api/cert/sangfor/verify-code` | GET | `getSangforVerifyCode()` | ✅ |
| `/api/cert/nisp/pinyin` | GET | `getNispPinyin()` | 🟡 |
| `/api/cert/nisp/template` | GET | `getNispTemplate()` | ✅ |
| `/api/quiz/categories` | GET | `getQuizCategories()` | ✅ |
| `/api/quiz/questions` | GET | `getQuizQuestions()` | ✅ |
| `/api/quiz/wrong-book` | GET | `getWrongBook()` | ✅ |
| `/api/quiz/wrong-book` | POST | `addWrongBook()` | ✅ |
| `/api/quiz/wrong-book/{id}` | DELETE | `removeWrongBook()` | ✅ |
| `/api/quiz/collections` | GET | `getFavoriteQuestions()` | ✅ |
| `/api/quiz/collections` | POST | `addFavorite()` | ✅ |
| `/api/quiz/collections/{id}` | DELETE | `removeFavorite()` | ✅ |
| `/api/quiz/checkin` | GET | `getCheckinRecords()` | ✅ |
| `/api/quiz/checkin` | POST | `submitCheckin()` | ✅ |
| `/api/quiz/submit` | POST | `submitQuizAnswer()` | 🟡 |
| `/api/auth/login` | POST | `wxLogin()` | ✅ |
| `/api/auth/refresh` | POST | `refreshToken()` | ✅ |
| `/api/auth/logout` | POST | `logout()` | ✅ |
| `/api/user/account` | DELETE | `deleteAccount()` | ✅ |
| `/api/user/phone/decrypt` | POST | `decryptPhone()` | ✅ |
| `/api/user/identity` | POST | `submitIdentity()` | ✅ |
| `/api/user/identity` | GET | `getIdentityStatus()` | ✅ |
| `/api/user/unbind` | POST | `unbindAccount()` | ✅ |
| `/api/user/profile` | GET | `getUserProfile()` | ✅ |
| `/api/user/profile` | PUT | `updateUserProfile()` | ✅ |
| `/api/orders` | POST | `createOrder()` | ✅ |
| `/api/orders` | GET | `getOrders()` | ✅ |
| `/api/orders/{id}` | GET | `getOrderDetail()` | ✅ |
| `/api/payment/prepay` | POST | `prepayOrder()` | 🟡 |
| `/api/payment/callback` | POST | — | ⬜ |
| `/api/points` | GET | `getPointsBalance()` | ✅ |
| `/api/points/history` | GET | `getPointRecords()` | ✅ |
| `/api/points/claim` | POST | `claimPoints()` | ✅ |
| `/api/points/redeem` | POST | `redeemPoints()` | ✅ |
| `/api/prices` | GET | `getPrices()` | ✅ |
| `/api/activities` | GET | `getActivities()` | ✅ |
| `/api/activities/register` | POST | `registerActivity()` | ✅ |
| `/api/activities/{id}/enroll` | POST | `enrollActivity()` | 🟡 |
| `/api/activities/{id}/remind` | POST | `remindActivity()` | ✅ |
| `/api/competition/stats` | GET | `getCompetitionStats()` | ✅ |
| `/api/competition/tracks` | GET | `getCompetitionTracks()` | ✅ |
| `/api/competition/signup` | POST | `signupCompetition()` | 🟡 |
| `/api/jobs` | GET | `getJobs()` | ✅ |
| `/api/jobs/{id}/apply` | POST | `applyJob()` | ✅ |
| `/api/collections` | GET | `getMyCollections()` | ✅ |
| `/api/collections` | POST | `addCollection()` | 🟡 |
| `/api/collections/{id}` | DELETE | `removeCollection()` | ✅ |
| `/api/coupons` | GET | `getCoupons()` | ✅ |
| `/api/coupons/assign` | POST | `assignCoupon()` | 🟡 |
| `/api/coupons/validate` | POST | `validateCoupon()` / `verifyCoupon()` | 🟡 |
| `/api/coupons/verify` | POST | — | ⬜ |
| `/api/tickets` | GET | `getTickets()` | ✅ |
| `/api/tickets` | POST | `createTicket()` | 🟡 |
| `/api/tickets/{id}` | GET | `getTicketDetail()` | ✅ |
| `/api/chat` | POST | `sendChatMessage()` | ✅ |
| `/api/chat/stream` | GET | `streamChatMessage()` | ✅ |
| `/api/quick-questions` | GET | `fetchQuickQuestions()` | ✅ |
| `/api/share` | POST | `createShare()` | 🟡 |
| `/api/share/{code}` | GET | `getShareInfo()` | ✅ |
| `/api/upload` | POST | `uploadFile()` / `uploadToOss()` | ✅ |
| `/api/media/{file_id}` | GET | `getMediaUrl()` | ✅ |
| `/api/system/poster` | GET | `getPoster()` | ✅ |
| `/api/system/upload` | POST | — (Platform 用 `/api/upload`) | ⬜ |
| `/api/system/media/{media_id}` | GET | `getSystemMediaUrl()` | ✅ |
| `/agreements` | GET | `getAgreements()` | 🔴 |
| `/agreements` | POST | `createAgreement()` | 🔴 |
| `/agreements/{id}/sign` | PUT | `signAgreement()` | 🔴 |

> 图例：✅ 正确 | 🟡 参数不匹配 | 🔴 路径不匹配 | ⬜ 未对接（正常）
