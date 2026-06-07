# 前后端 API 对接情况

> 扫描日期：2026-06-07
> 范围：Backend (`app/api/*` + `app/main.py`) ↔ Platform (`src/services/*.ts`)

---

## 一、总览

| 维度 | 数量 |
|------|------|
| Backend `/api/*` 端点总数 | 78 |
| Backend 非 `/api` 端点（agreement + health） | 5 |
| Platform `service/*.ts` 调用点 | 79 |
| **路径正确对接** | **79** |
| **参数正确对接** | **79** |
| 参数不匹配 | 0 |

---

## 二、路径不匹配 / 缺失端点

**无。** 所有端点路径均已对齐。

> 上期（2026-06-06）Agreements 路径前缀问题已修复：Platform 改用 `/agreements`（不含 `/api` 前缀），与 Backend 在 `main.py` 中直接注册 `agreement_router` 到 `app` 的路由一致。

---

## 三、参数不匹配

**无。** 所有端点参数均已对齐。

---

## 四、已修复项（对比上期 2026-06-06 报告）

| 问题 | 状态 |
|------|------|
| Agreements 路径前缀缺失 | ✅ Platform 已改用 `/agreements` |
| `signupCompetition` schema 完全不同 | ✅ 已改为 `{ competition_name, school, track }` |
| `createShare` 字段名 `type`→`target_type` | ✅ 已修正 |
| `submitQuizAnswer` schema 不一致 | ✅ `answer`→`user_answer`，去 `is_correct`，`question_id`→`number` |
| `validateCoupon` 字段名 `code`→`coupon_code` | ✅ 已修正 |
| `getNispPinyin` 参数名 `text`→`name` | ✅ 已修正 |
| `createTicket` schema 不一致 | ✅ `title`/`description` 合并为 `content` |
| `addCollection` 字段名 `type`→`target_type` | ✅ 已修正 |
| `assignCoupon` schema 不一致 | ✅ `coupon_id`→`coupon_code`，去 `user_id` |
| `prepayOrder` order_id 类型 `string`→`number` | ✅ 已修正 |
| `getCourseById` id 类型 `string`→`number` | ✅ 已修正 |
| `submitCheckin` 缺 body | ✅ 已修正 |
| `addFavorite` question_id 类型 `string` | ✅ 已修正 |
| `removeFavorite` 路径参数类型 `string` | ✅ 已修正 |
| 缺失端点 `GET /api/user/exam-intentions` | ✅ Platform 已移除 |
| 缺失端点 `GET /api/user/teachers` | ✅ Platform 已移除 |
| `verifyCoupon()` 字段名 | ✅ 使用正确字段名 `coupon_code` |
| `enrollActivity` 缺参数 | ✅ 增加可选 `name`/`phone`/`remark` 参数 |

---

## 五、正确对接的端点（全部 76 个）

### Zone 专区聚合（6 个）
| # | 方法 | Backend 端点 | Platform 函数 | 状态 |
|---|------|-------------|--------------|------|
| 1 | GET | `/api/zones` | `getHomeAggregation()` | ✅ |
| 2 | GET | `/api/zones/cert` | `getCertZone()` | ✅ |
| 3 | GET | `/api/zones/study` | `getStudyZone()` | ✅ |
| 4 | GET | `/api/zones/competition` | `getCompetitionZone()` | ✅ |
| 5 | GET | `/api/zones/activity` | `getActivityZone()` | ✅ |
| 6 | GET | `/api/zones/employment` | `getEmploymentZone()` | ✅ |

### 课程（5 个）
| # | 方法 | Backend 端点 | Platform 函数 | 状态 |
|---|------|-------------|--------------|------|
| 7 | GET | `/api/courses` | `getCourseList()` / `getCourseListExpanded()` | ✅ |
| 8 | GET | `/api/courses/categories` | `getCourseCategories()` | ✅ |
| 9 | GET | `/api/courses/{id}` | `getCourseById()` | ✅ |
| 10 | GET | `/api/courses/my` | `getMyCourses()` | ✅ |
| 11 | POST | `/api/courses/enroll` | `enrollCourse()` | ✅ |

### 认证项目（7 个）
| # | 方法 | Backend 端点 | Platform 函数 | 状态 |
|---|------|-------------|--------------|------|
| 12 | GET | `/api/cert/certifications` | `getCertifications()` | ✅ |
| 13 | GET | `/api/cert/certifications/{id}` | `getCertDetail()` | ✅ |
| 14 | GET | `/api/cert/certifications/tags` | `getRegistrationTagFilters()` | ✅ |
| 15 | GET | `/api/cert/sangfor/coupons` | `getSangforCoupons()` | ✅ |
| 16 | GET | `/api/cert/sangfor/verify-code` | `getSangforVerifyCode()` | ✅ |
| 17 | GET | `/api/cert/nisp/pinyin` | `getNispPinyin()` | ✅ |
| 18 | GET | `/api/cert/nisp/template` | `getNispTemplate()` | ✅ |

### 题库（11 个）
| # | 方法 | Backend 端点 | Platform 函数 | 状态 |
|---|------|-------------|--------------|------|
| 19 | GET | `/api/quiz/categories` | `getQuizCategories()` | ✅ |
| 20 | GET | `/api/quiz/questions` | `getQuizQuestions()` | ✅ |
| 21 | GET | `/api/quiz/wrong-book` | `getWrongBook()` | ✅ |
| 22 | GET | `/api/quiz/collections` | `getFavoriteQuestions()` | ✅ |
| 23 | GET | `/api/quiz/checkin` | `getCheckinRecords()` | ✅ |
| 24 | POST | `/api/quiz/submit` | `submitQuizAnswer()` | ✅ |
| 25 | POST | `/api/quiz/wrong-book` | `addWrongBook()` | ✅ |
| 26 | DELETE | `/api/quiz/wrong-book/{id}` | `removeWrongBook()` | ✅ |
| 27 | POST | `/api/quiz/collections` | `addFavorite()` | ✅ |
| 28 | DELETE | `/api/quiz/collections/{id}` | `removeFavorite()` | ✅ |
| 29 | POST | `/api/quiz/checkin` | `submitCheckin()` | ✅ |

### 认证（登录/用户）（8 个）
| # | 方法 | Backend 端点 | Platform 函数 | 状态 |
|---|------|-------------|--------------|------|
| 30 | POST | `/api/auth/login` | `wxLogin()` | ✅ |
| 31 | POST | `/api/auth/refresh` | `refreshToken()` | ✅ |
| 32 | POST | `/api/auth/logout` | `logout()` | ✅ |
| 33 | DELETE | `/api/user/account` | `deleteAccount()` | ✅ |
| 34 | POST | `/api/user/phone/decrypt` | `decryptPhone()` | ✅ |
| 35 | POST | `/api/user/identity` | `submitIdentity()` | ✅ |
| 36 | GET | `/api/user/identity` | `getIdentityStatus()` | ✅ |
| 37 | POST | `/api/user/unbind` | `unbindAccount()` | ✅ |

### 订单 / 支付（4 个）
| # | 方法 | Backend 端点 | Platform 函数 | 状态 |
|---|------|-------------|--------------|------|
| 38 | POST | `/api/orders` | `createOrder()` | ✅ |
| 39 | GET | `/api/orders` | `getOrders()` / `getRegisteredExams()` | ✅ |
| 40 | GET | `/api/orders/{id}` | `getOrderDetail()` | ✅ |
| 41 | POST | `/api/payment/prepay` | `prepayOrder()` | ✅ |

### 用户资料 / 积分（4 个）
| # | 方法 | Backend 端点 | Platform 函数 | 状态 |
|---|------|-------------|--------------|------|
| 42 | GET | `/api/user/profile` | `getUserProfile()` | ✅ |
| 43 | PUT | `/api/user/profile` | `updateUserProfile()` | ✅ |
| 44 | GET | `/api/points` | `getPointsBalance()` | ✅ |
| 45 | GET | `/api/points/history` | `getPointRecords()` | ✅ |

### 积分扩展 / 价格（3 个）
| # | 方法 | Backend 端点 | Platform 函数 | 状态 |
|---|------|-------------|--------------|------|
| 46 | POST | `/api/points/claim` | `claimPoints()` | ✅ |
| 47 | POST | `/api/points/redeem` | `redeemPoints()` | ✅ |
| 48 | GET | `/api/prices` | `getPrices()` | ✅ |

### 活动 / 竞赛 / 岗位（8 个）
| # | 方法 | Backend 端点 | Platform 函数 | 状态 |
|---|------|-------------|--------------|------|
| 49 | GET | `/api/activities` | `getActivities()` | ✅ |
| 50 | POST | `/api/activities/register` | `registerActivity()` | ✅ |
| 51 | POST | `/api/activities/{id}/enroll` | `enrollActivity()` | ✅ |
| 52 | POST | `/api/activities/{id}/remind` | `remindActivity()` | ✅ |
| 53 | GET | `/api/competition/stats` | `getCompetitionStats()` | ✅ |
| 54 | GET | `/api/competition/tracks` | `getCompetitionTracks()` | ✅ |
| 55 | POST | `/api/competition/signup` | `signupCompetition()` | ✅ |
| 56 | POST | `/api/jobs/{id}/apply` | `applyJob()` | ✅ |

### 收藏 / 优惠券 / 工单（9 个）
| # | 方法 | Backend 端点 | Platform 函数 | 状态 |
|---|------|-------------|--------------|------|
| 57 | GET | `/api/collections` | `getMyCollections()` | ✅ |
| 58 | POST | `/api/collections` | `addCollection()` | ✅ |
| 59 | DELETE | `/api/collections/{id}` | `removeCollection()` | ✅ |
| 60 | GET | `/api/coupons` | `getCoupons()` | ✅ |
| 61 | POST | `/api/coupons/assign` | `assignCoupon()` | ✅ |
| 62 | POST | `/api/coupons/validate` | `validateCoupon()` / `verifyCoupon()` | ✅ |
| 63 | GET | `/api/tickets` | `getTickets()` | ✅ |
| 64 | POST | `/api/tickets` | `createTicket()` | ✅ |
| 65 | GET | `/api/tickets/{id}` | `getTicketDetail()` | ✅ |

### 客服 / 分享 / 媒体（7 个）
| # | 方法 | Backend 端点 | Platform 函数 | 状态 |
|---|------|-------------|--------------|------|
| 66 | POST | `/api/chat` | `sendChatMessage()` | ✅ |
| 67 | GET | `/api/chat/stream` | `streamChatMessage()` | ✅ |
| 68 | GET | `/api/quick-questions` | `fetchQuickQuestions()` | ✅ |
| 69 | POST | `/api/share` | `createShare()` | ✅ |
| 70 | GET | `/api/share/{code}` | `getShareInfo()` | ✅ |
| 71 | POST | `/api/upload` | `uploadFile()` / `uploadToOss()` | ✅ |
| 72 | GET | `/api/media/{file_id}` | `getMediaUrl()` | ✅ |

### 系统 / 岗位列表 / 协议（7 个）
| # | 方法 | Backend 端点 | Platform 函数 | 状态 |
|---|------|-------------|--------------|------|
| 73 | GET | `/api/system/poster` | `getPoster()` | ✅ |
| 74 | GET | `/api/system/media/{media_id}` | `getSystemMediaUrl()` | ✅ |
| 75 | GET | `/api/jobs` | `getJobs()` | ✅ |
| 76 | GET | `/agreements` | `getAgreements()` | ✅ |
| 77 | POST | `/agreements` | `createAgreement()` | ✅ |
| 78 | PUT | `/agreements/{id}/sign` | `signAgreement()` | ✅ |

---

## 六、Backend 独有端点（正常，无需前端对接）

- `POST /api/payment/callback` — 微信支付回调（服务端间调用）
- `POST /api/coupons/verify` — 核销优惠券主端点（Platform 使用 `/validate` 别名）
- `POST /api/system/upload` — 系统上传（Platform 使用 `/api/upload`）

---

## 七、请求工具说明

Platform 使用 `@/utils/request.ts` 统一封装，通过 `Taro.request` 发起请求，特性：
- `BASE_URL` 由环境变量 `TARO_APP_API_BASE` 决定，默认为空
- 自动注入 `Authorization: Bearer <token>` header
- 统一解析 `{ code: 0, data: T, message: string }` 响应
- `code === 401` 时自动清除 token 并跳转登录页
- 各 service 文件通过 `USE_MOCK = false` 控制 mock/API 双模切换

Backend 响应格式：`APIResponse[T]` = `{ code: int, data: T, message: str }`，`code=0` 表示成功。

---

## 八、对接状态

**全部端点已完成对接。** 路径、字段名、参数类型均与 Backend 一致。

---

> 图例：✅ 正确 | 🟡 低优先级 | 🔴 阻塞 | ⬜ 未对接（正常）
