# Platform 前端与 Backend API 对齐分析报告

> 日期：2026-06-09  
> 后端来源：`http://64.90.3.51:10001/openapi.json`（weMiniApp v0.1.0，167 端点，261 Schema）  
> 前端来源：`Platform/src/` — 6 个 service 文件 + 16 个 type 文件  
> 环境配置：`TARO_APP_API_BASE=http://64.90.3.51:10001/`

---

## 一、总览

| 类别 | 数量 | 说明 |
|------|:---:|------|
| URL 路径错误 | **9** | 前端调用的 API 路径与后端不一致 |
| 请求体字段不匹配 | **8** | 前端发送的字段名/结构与后端 Schema 不同 |
| 类型定义不匹配 | **8** | 前端 TypeScript 类型与后端 Pydantic Schema 不一致 |
| 响应处理缺失 | **5** | 前端忽略或未正确处理后端响应字段 |
| 服务层逻辑问题 | **2** | 数据映射逻辑与实际 API 行为不符 |

---

## 二、URL 路径错误（9 处）

### A1. `getPrices` — 价格配置

| 项目 | 值 |
|------|-----|
| 文件 | `src/services/userService.ts:408` |
| 当前路径 | `GET /api/price-config` |
| 正确路径 | `GET /api/prices` |
| 后端响应 | `list<PriceResponse>` — `[{cert_type, user_type, price}]` |

### A2. `submitCheckin` — 打卡签到

| 项目 | 值 |
|------|-----|
| 文件 | `src/services/userService.ts:246` |
| 当前路径 | `POST /api/checkin` |
| 正确路径 | `POST /api/quiz/checkin` |
| 请求体 | `QuizCheckinRequest {questions_completed?: int}` |
| 响应 | `QuizCheckinResponse {id?, checkin_date*, checked_in*, questions_completed*, consecutive_days*}` |

### A3. `prepayOrder` — 支付预下单

| 项目 | 值 |
|------|-----|
| 文件 | `src/services/userService.ts:205` |
| 当前路径 | `POST /api/orders/{orderId}/pay` |
| 正确路径 | `POST /api/payment/prepay` |
| 请求体 | `PaymentPrepayRequest {order_id: int*}` |

### A4. `getSangforVerifyCode` — 深信服验证码

| 项目 | 值 |
|------|-----|
| 文件 | `src/services/userService.ts:378` |
| 当前路径 | `POST /api/sms/verify-code` |
| 正确路径 | `POST /api/cert/sangfor/verify-code` |

### A5. `getNispPinyin` — NISP 拼音

| 项目 | 值 |
|------|-----|
| 文件 | `src/services/userService.ts:383` |
| 当前路径 | `GET /api/utils/pinyin?text=xxx` |
| 正确路径 | `GET /api/cert/nisp/pinyin` |

### A6. `getNispTemplate` — NISP 模板

| 项目 | 值 |
|------|-----|
| 文件 | `src/services/userService.ts:389` |
| 当前路径 | `GET /api/system/template/nisp` |
| 正确路径 | `GET /api/cert/nisp/template` |

### A7. `sendChatMessage` — 聊天

| 项目 | 值 |
|------|-----|
| 文件 | `src/services/userService.ts:304` |
| 当前请求体 | `{content: string}` |
| 后端 `ChatRequest` | `{message: string*, session_id?: string}` |

### A8. `getMyCourses` — 我的课程

| 项目 | 值 |
|------|-----|
| 文件 | `src/services/courseService.ts:34` |
| 当前路径 | `GET /api/courses/me`（不含末尾 s） |
| 正确路径 | `GET /api/courses/my` |

### A9. `getFavorites` — 收藏题库

| 项目 | 值 |
|------|-----|
| 文件 | `src/services/quizService.ts:32` |
| 当前变量名 | `getFavoriteQuestions` 调用 `GET /api/quiz/collections` |
| 后端响应 | `PaginatedData<QuizRecordQuestionResponse>`，需要取 `data.items` |
| 问题 | 响应结构未适配分页，且 QuizRecordQuestionResponse 字段名与前端 QuizQuestion 不一致 |

---

## 三、请求体字段不匹配（8 处）

### B1. `createTicket` — 创建工单

| 项目 | 值 |
|------|-----|
| 文件 | `src/services/userService.ts:465` |
| 当前发送 | `{title: string, description: string}` |
| 后端 `TicketCreateRequest` | `{content: string*}` |
| 影响 | 字段名不匹配，后端无法正确解析 |

### B2. `addFavorite` / `removeFavorite` — 收藏

| 项目 | 值 |
|------|-----|
| 文件 | `src/services/userService.ts:232,237` |
| 当前发送 | `{resource_type: 'course', resource_id: courseId}` |
| 后端 `CollectionCreate` | `{target_type: string*, target_id: int*}` |
| 影响 | `resource_type` → `target_type`，`resource_id` → `target_id` |

### B3. `addCollection` / `removeCollection` — 收藏扩展

| 项目 | 值 |
|------|-----|
| 文件 | `src/services/userService.ts:418,425` |
| 当前发送 | `{resource_type: type, resource_id: id}` |
| 后端 Schema | `{target_type: string*, target_id: int*}` |
| 影响 | 同 B2 |

### B4. `createAgreement` — 创建协议

| 项目 | 值 |
|------|-----|
| 文件 | `src/services/userService.ts:314` |
| 当前发送 | `{type: string, content?: string}` |
| 后端 `AgreementCreate` | `{type: string*, content?: string}` |
| 影响 | 字段名匹配，但后端 POST `/api/agreements` 实际无 request body（需确认） |

### B5. `signAgreement` — 协议签名

| 项目 | 值 |
|------|-----|
| 文件 | `src/services/userService.ts:320` |
| 当前发送 | `{signature_image: signatureImage}` |
| 后端 `AgreementSign` | `{signature_image: string*}` |
| 影响 | 字段名匹配 ✅ |

### B6. `validateCoupon` / `verifyCoupon` — 优惠券

| 项目 | 值 |
|------|-----|
| 文件 | `src/services/userService.ts:256,518` |
| 当前发送 | `{coupon_code: code}` |
| 后端 `CouponVerifyRequest` | `{coupon_code: string*}` |
| 影响 | 字段名匹配 ✅ |

### B7. `assignCoupon` — 领取优惠券

| 项目 | 值 |
|------|-----|
| 文件 | `src/services/userService.ts:510` |
| 当前发送 | `{coupon_code: couponId}` |
| 后端 `CouponAssignRequest` | `{coupon_code: string*}` |
| 影响 | 字段名匹配 ✅ |

### B8. `enrollActivity` — 活动报名

| 项目 | 值 |
|------|-----|
| 文件 | `src/services/zoneService.ts:167` |
| 当前发送 | `{name?, phone?, remark?}`（当有值时发送） |
| 后端 `ActivityRegisterRequest` | `{activity_id: int*, name: string*, phone: string*, remark?: string}` |
| 问题 | 后端 `activity_id` 在路径参数中已提供但 Schema 要求也在请求体中出现；POST `/api/activities/{id}/enroll` 的 body 是 inline |

---

## 四、类型定义不匹配（8 处）

### C1. `QuizCategory` ↔ `QuizCategoryTreeResponse`

| 前端 `types/quiz.ts` | 后端 Schema |
|------|------|
| `id: string` | `id: int*` |
| `name: string` | `name: string*` |
| `questionCount: number` | `question_count: int` |
| `icon: string` | ❌ 不存在 |
| ❌ 缺少 | `description: string` |
| ❌ 缺少 | `parent_id: int?` |
| ❌ 缺少 | `children: QuizCategoryTreeResponse[]` |
| ❌ 缺少 | 递归树结构 |

### C2. `QuizQuestion` ↔ `QuizQuestionResponse`

| 前端 `types/quiz.ts` | 后端 Schema |
|------|------|
| `id: string` | `id: int*` |
| `categoryId: string` | `category_id: int*` |
| `stem: string` | `question_text: string*` |
| `options: QuizOption[]` | `options: dict`（JSON 对象） |
| `correctAnswer: number \| number[]` | ❌（C端不返回） |
| `type: 'single' \| 'multiple'` | `question_type: string*` |
| `explanation: string` | `explanation: string?` |

### C3. `QuizOption` ↔ 后端 `options`

| 前端 | 后端 |
|------|------|
| `{label: string, text: string}[]` | `dict` — 键为选项标识(A,B,C,D)，值为文本 |

### C4. `BannerBrief` 字段缺失

| 前端 `types/zone.ts` | 后端 Schema |
|------|------|
| `id: number` | ✅ |
| `image_url: string` | ✅ |
| `jump_link: string \| null` | ✅ |
| `sort: number` | ✅ |
| ❌ 缺少 | `target_id: int?` |
| ❌ 缺少 | `target_type: string?` |
| ❌ 缺少 | `start_time: string?` |
| ❌ 缺少 | `end_time: string?` |
| ❌ 缺少 | `is_active: bool?` |

### C5. `ZoneBrief` 多余字段

| 前端 `types/zone.ts` | 后端 Schema |
|------|------|
| `gradient?: string` | ❌ 不存在 |
| `icon?: string` | ❌ 不存在 |
| `tag?: string` | ❌ 不存在 |
| `tagColor?: string` | ❌ 不存在 |

这些是前端 UI 层的装饰字段，不应作为后端数据模型的一部分。如果需要，应在前端页面层本地派生。

### C6. `UserProfileUpdatePayload` 多余字段

| 前端 `types/profile.ts` | 后端 Schema |
|------|------|
| `id_card?: string` | ❌ 不存在 |

后端 `UserProfileUpdate` 字段：`phone?, email?, gender?, education?, school?, major?, organization?`

### C7. `ActivityBrief.max_participants` 可空

| 前端 | 后端 |
|------|------|
| `max_participants: number` | `max_participants: int`（integer 类型） |
| 在 `ActivityResponse` 中为可空 | |

### C8. `Order` 展示型 vs `OrderResponse`

前端 `Order` 是展示映射后的对象，`OrderBackendItem` 基本对齐后端 `OrderResponse`。
无明显不匹配。✅

---

## 五、响应处理缺失（5 处）

### D1. `submitQuizAnswer` 忽略响应

| 项目 | 值 |
|------|-----|
| 文件 | `src/services/quizService.ts:57` |
| 当前签名 | `Promise<void>` |
| 后端响应 | `QuizSubmitResponse {question_id*, user_answer*, correct_answer*, is_correct*, is_wrong*, record_id*, explanation?}` |
| 影响 | 调用方无法获知答题结果、正确答案、是否加入错题本 |

### D2. `getQuizCategories` 未处理递归树

| 项目 | 值 |
|------|-----|
| 文件 | `src/services/quizService.ts:13` |
| 当前行为 | 直接返回 `res.data`，期望平铺数组 |
| 后端响应 | `list<QuizCategoryTreeResponse>` — 递归树结构 |
| 影响 | 前端无法渲染分类树 |

### D3. `getQuizQuestions` 不解析 `options` dict

| 项目 | 值 |
|------|-----|
| 文件 | `src/services/quizService.ts:21` |
| 后端 `options` | `dict`（如 `{"A":"网络层","B":"传输层",...}`） |
| 前端期望 | `[{label:"A", text:"网络层"}, ...]` |
| 影响 | 选项无法渲染 |

### D4. `getCheckinRecords` 响应结构错误

| 项目 | 值 |
|------|-----|
| 文件 | `src/services/quizService.ts:38` |
| 当前泛型 | `get<{checkin_date, checked_in}>` |
| 后端 `QuizCheckinResponse` | `{id?, checkin_date*, checked_in*, questions_completed*, consecutive_days*}` |

### D5. `createShare` 响应字段名

| 项目 | 值 |
|------|-----|
| 文件 | `src/services/userService.ts:483` |
| 当前泛型 | `{code, url}` |
| 后端 `ShareCreateResponse` | `{code: string*, share_url: string*}` |
| 影响 | `res.data.url` → `res.data.share_url` |

---

## 六、服务层逻辑问题（2 处）

### E1. `getMyCourses` 路径

| 项目 | 值 |
|------|-----|
| 文件 | `src/services/courseService.ts:34` |
| 当前路径 | `GET /api/courses/me` |
| 正确路径 | `GET /api/courses/my` |
| 后端响应 | `PaginatedData<CourseEnrollmentResponse>`，含嵌套 `course` 对象 |
| 备注 | 当前映射层已处理嵌套，只需改路径 |

### E2. `createOrder` 字段名

| 项目 | 值 |
|------|-----|
| 文件 | `src/services/userService.ts:192` |
| 前端发送 | `{cert_type, candidate_name, candidate_phone, candidate_idcard?, extra_data?, attachments?}` |
| 后端 `OrderCreate` | `{cert_type*, candidate_name*, candidate_phone*, candidate_idcard?, extra_data?, attachments?}` |
| 影响 | 字段名全部匹配 ✅ |

---

## 七、已正确对齐的接口（无需修改）

| 接口 | 路径 | 说明 |
|------|------|------|
| `wxLogin` | `POST /api/auth/login` | ✅ |
| `refreshToken` | `POST /api/auth/refresh` | ✅ |
| `logout` | `POST /api/auth/logout` | ✅ |
| `getUserProfile` | `GET /api/user/profile` | ✅ |
| `updateUserProfile` | `PUT /api/user/profile` | ✅ |
| `getIdentityStatus` | `GET /api/user/identity` | ✅ |
| `submitIdentity` | `POST /api/user/identity` | ✅ |
| `deleteAccount` | `DELETE /api/user/account` | ✅ |
| `decryptPhone` | `POST /api/user/phone/decrypt` | ✅ |
| `unbindAccount` | `POST /api/user/unbind` | ✅ |
| `getHomeAggregation` | `GET /api/zones` | ✅ |
| `getCertificationList` | `GET /api/cert/certifications` | ✅ |
| `getCertDetail` | `GET /api/cert/certifications/{id}` | ✅ |
| `getRegistrationTagFilters` | `GET /api/cert/certifications/tags` | ✅ |
| `getCourseList` | `GET /api/courses` | ✅ |
| `getCourseById` | `GET /api/courses/{id}` | ✅ |
| `getCourseCategories` | `GET /api/courses/categories` | ✅ |
| `enrollCourse` | `POST /api/courses/enroll` | ✅ |
| `getOrders` | `GET /api/orders` | ✅ |
| `getOrderDetail` | `GET /api/orders/{id}` | ✅ |
| `getPointsBalance` | `GET /api/points` | ✅ |
| `getPointRecords` | `GET /api/points/history` | ✅ |
| `claimPoints` | `POST /api/points/claim` | ✅ |
| `redeemPoints` | `POST /api/points/redeem` | ✅ |
| `getCoupons` | `GET /api/coupons` | ✅ |
| `getTickets` | `GET /api/tickets` | ✅ |
| `getTicketDetail` | `GET /api/tickets/{id}` | ✅ |
| `uploadFile` | `POST /api/upload` | ✅ |
| `uploadToOss` | `POST /api/upload` | ✅ |
| `createShare` | `POST /api/share` | ✅（响应字段需要 `share_url`） |
| `getShareInfo` | `GET /api/share/{code}` | ✅ |
| `getMediaUrl` | `GET /api/media/{id}` | ✅ |
| `getSystemMediaUrl` | `GET /api/media/{id}` | ✅ |
| `getPoster` | `GET /api/system/poster` | ✅ |
| `fetchQuickQuestions` | `GET /api/quick-questions` | ✅ |
| `getActivityList` | `GET /api/activities` | ✅ |
| `getJobList` | `GET /api/jobs` | ✅ |
| `signupCompetition` | `POST /api/competition/signup` | ✅ |
| `applyJob` | `POST /api/jobs/{id}/apply` | ✅ |
| `getCompetitionList` | `GET /api/competition/tracks` | ✅ |
| `getCompetitionStats` | `GET /api/competition/stats` | ✅ |
| `getCompetitionTracks` | `GET /api/competition/tracks` | ✅ |
| `getJobs` | `GET /api/jobs` | ✅ |
| `getActivities` | `GET /api/activities` | ✅ |
| `registerActivity` | `POST /api/activities/{id}/register` | ✅ |
| `remindActivity` | `POST /api/activities/{id}/remind` | ✅ |

---

## 八、修改优先级

### P0 — 阻断级（路径错误，请求 404）

| # | 函数 | 修改 |
|---|------|------|
| A1 | `getPrices` | `/api/price-config` → `/api/prices` |
| A2 | `submitCheckin` | `/api/checkin` → `/api/quiz/checkin` |
| A3 | `prepayOrder` | `/api/orders/{id}/pay` → `/api/payment/prepay` |
| A4 | `getSangforVerifyCode` | `/api/sms/verify-code` → `/api/cert/sangfor/verify-code` |
| A5 | `getNispPinyin` | `/api/utils/pinyin` → `/api/cert/nisp/pinyin` |
| A6 | `getNispTemplate` | `/api/system/template/nisp` → `/api/cert/nisp/template` |
| E1 | `getMyCourses` | `/api/courses/me` → `/api/courses/my` |

### P1 — 功能级（请求体字段、响应未处理）

| # | 函数 | 修改 |
|---|------|------|
| B1 | `createTicket` | `{title,description}` → `{content}` |
| B2 | `addFavorite/removeFavorite` | `resource_type,resource_id` → `target_type,target_id` |
| B3 | `addCollection/removeCollection` | 同上 |
| A7 | `sendChatMessage` | `{content}` → `{message}` |
| D1 | `submitQuizAnswer` | 返回类型从 `void` → `QuizSubmitResponse` |
| D5 | `createShare` | `res.data.url` → `res.data.share_url` |
| C4 | `BannerBrief` | 补充 `target_id?, target_type?, start_time?, end_time?, is_active?` |

### P2 — 类型级（类型定义修正）

| # | 类型 | 修改 |
|---|------|------|
| C1 | `QuizCategory` | 适配递归树结构 `QuizCategoryTreeResponse` |
| C2 | `QuizQuestion` | `stem`→`question_text`, `type`→`question_type`, 补充 `category_id` |
| C3 | `QuizOption` | 适配 dict 格式 |
| C5 | `ZoneBrief` | 移除 `gradient, icon, tag, tagColor` |
| C6 | `UserProfileUpdatePayload` | 移除 `id_card` |
| D2 | `getQuizCategories` | 树遍历/展平逻辑 |
| D3 | `getQuizQuestions` | dict→数组转换 |
| D4 | `getCheckinRecords` | 适配 `QuizCheckinResponse` |

---

## 九、涉及文件总览

| 文件 | 修改项 |
|------|------|
| `src/services/userService.ts` | A1-A6, B1-B7, A7, D5 |
| `src/services/courseService.ts` | E1 |
| `src/services/quizService.ts` | A9, D1-D4 |
| `src/services/zoneService.ts` | B8 |
| `src/types/quiz.ts` | C1, C2, C3 |
| `src/types/zone.ts` | C4, C5, C7 |
| `src/types/profile.ts` | C6 |
| `src/utils/request.ts` | ✅ 无需修改 |
| `src/services/authService.ts` | ✅ 无需修改 |
| `src/services/dataService.ts` | ✅ 无需修改 |

---

> 分析基于线上 `openapi.json` 自动提取，与手动编写的接口文档可能存在微小差异。  
> 后端环境地址：`http://64.90.3.51:10001`，Swagger：`http://64.90.3.51:10001/docs`
