# 后端接口大面积更新 — 前端适配计划

> 依据：`http://100.64.0.3:8000/openapi.json`（121 路径，252 schema）
> 对比基准：`src/services/`、`src/types/zone.ts`、`src/utils/request.ts`
> 日期：2026-06-08

---

## 0. 背景

后端接口规范统一为 `{ code: int, message: string, data: T | null }` 响应格式，与前端 `request.ts` 中 `ApiResponse<T>` 一致。本次整改重点解决以下问题：

1. **首页聚合结构变更** — `HomeAggregationResponse` 的 `zones` 从数组变为嵌套对象 `ZoneSectionData`
2. **专区子端点移除** — `/api/zones/cert`、`/api/zones/competition` 等 5 个端点不存在
3. **协议端点缺失** — 后端无小程序端 `/api/agreements` 端点
4. **路径参数名不一致** — `enrollActivity`、`remindActivity` 中 `{id}` 应为 `{activity_id}`
5. **用户资料字段差异** — 前端有 `nickname`/`avatar`，后端无；后端有 `user_type`/`gender`/`identity_status`，前端无
6. **支付参数字段名** — 后端 `time_stamp`/`nonce_str` vs 前端 `timeStamp`/`nonceStr`

## 1. 影响范围汇总

| 文件 | 变更类型 | 摘要 |
|------|----------|------|
| `src/types/zone.ts` | 重构 | HomeAggregationResponse 结构变更，移除 5 个废弃 ZoneResponse 类型 |
| `src/types/index.ts` | 微调 | 同步 zone.ts 导出变更 |
| `src/services/zoneService.ts` | 重构 | mock/解析逻辑对齐新结构，移除 getCompetitionZone，修复路径参数 |
| `src/services/userService.ts` | 修改 | 协议函数降级，getUserProfile 字段对齐，createOrder 字段验证 |
| `src/services/dataService.ts` | 微调 | 移除废弃函数导出 |
| `src/pages/index/index.tsx` | 适配 | 首页数据消费路径从顶级 courses/activities 移到 zones[key].* |
| `src/pages/activity-zone/index.tsx` | 适配 | 移除 getCompetitionZone，从聚合数据提取竞赛/活动/就业 |
| `src/pages/mine/agreements.tsx` | 降级 | 协议端点缺失，USE_MOCK 兜底 |
| `src/pages/mine/edit-profile.tsx` | 适配 | getUserProfile 字段名变更（nickname → real_name） |
| `src/pages/mine/personal-info.tsx` | 适配 | 同上 |
| `src/pages/profile/index.tsx` | 适配 | 同上 |
| `src/pages/registration/form.tsx` | 适配 | createOrder 字段验证 |
| `src/pages/registration/form-sangfor.tsx` | 适配 | 同上 |
| `src/pages/registration/form-nisp.tsx` | 适配 | 同上 |
| `src/pages/registration/form-renshe.tsx` | 适配 | 同上 |

---

## 2. Phase 1 — 类型层 `src/types/zone.ts`

### 2.1 Todo

- [ ] 新增 `ZoneSectionData` 接口
- [ ] 修改 `HomeAggregationResponse.zones` 类型
- [ ] 移除 `HomeAggregationResponse.courses` / `.activities` 顶级字段
- [ ] 移除 `CompetitionZoneResponse`、`CertZoneResponse`、`StudyZoneResponse`、`ActivityZoneResponse`、`EmploymentZoneResponse`
- [ ] 更新 `src/types/index.ts` 导出

### 2.2 目标结构

```typescript
/** 单个专区的聚合数据块 */
export interface ZoneSectionData {
  items: ZoneBrief[]
  courses?: CourseBrief[] | null
  activities?: ActivityBrief[] | null
  certifications?: CertificationResponse[] | null
  trainings?: TrainingBrief[] | null
}

/** 首页聚合 */
export interface HomeAggregationResponse {
  banners: BannerBrief[]
  zones: Record<string, ZoneSectionData>  // key = "cert"|"study"|"competition"|"activity"|"employment"
}
```

### 2.3 审计标准

- [ ] 每个字段的类型、nullable 标记与 `openapi.json` schemas 一致
- [ ] `src/types/index.ts` 不导出已删除的类型
- [ ] TypeScript 编译无类型错误

### 2.4 交付标准

`src/types/zone.ts` 字段级对齐后端 OpenAPI。

---

## 3. Phase 2 — 服务层 `src/services/zoneService.ts`

### 3.1 Todo

- [ ] 重写 `getHomeAggregation()` mock 数据（构造 ZoneSectionData，清除顶级 courses/activities）
- [ ] 调整真实 API 调用的解析逻辑（如有）
- [ ] 删除 `getCompetitionZone()` 函数
- [ ] `enrollActivity()` 路径 `{id}` → `{activity_id}`
- [ ] `remindActivity()` 路径 `{id}` → `{activity_id}`

### 3.2 审计标准

- [ ] mock 对象通过 TypeScript 类型检查
- [ ] `grep -r 'getCompetitionZone' src/` 零匹配
- [ ] 路径字符串与 OpenAPI paths 精确匹配

### 3.3 交付标准

仅调用后端存在的端点，mock 数据通过类型检查。

---

## 4. Phase 3 — 服务层 `src/services/userService.ts`

### 4.1 Todo

- [ ] `getAgreements()` — USE_MOCK=false 时返回空数组 + console.warn（端点不存在）
- [ ] `createAgreement()` — 标注为暂不可用
- [ ] `signAgreement()` — 标注为暂不可用
- [ ] `getUserProfile()` — 返回类型对齐 `UserProfileDetail`（移除 nickname/avatar，添加 user_type/gender/identity_status）
- [ ] `createOrder()` — 验证字段与后端 `OrderCreate` schema 一致

### 4.2 审计标准

- [ ] `getUserProfile()` 返回类型每个字段可在 `UserProfileDetail` schema 中对应
- [ ] 不可用函数有注释说明原因
- [ ] `createOrder()` 字段与后端 required/optional 一致

### 4.3 交付标准

所有函数路径与后端一致或有明确降级策略。

---

## 5. Phase 4 — 页面层 `src/pages/index/index.tsx`

### 5.1 Todo

数据消费路径映射：

| 当前 | 改为 |
|------|------|
| `homeData?.courses` | `homeData?.zones['study']?.courses` |
| `homeData?.activities` | `homeData?.zones['activity']?.activities` |
| `homeData?.zones['cert']` | `homeData?.zones['cert']?.items` |
| `homeData?.zones['competition']` | `homeData?.zones['competition']?.items` |
| `homeData?.zones['employment']` | `homeData?.zones['employment']?.items` |

同步更新 `console.log` 调试输出。

### 5.2 审计标准

- [ ] `HomeCard items={}` prop 类型兼容（`ZoneBrief[] | CourseBrief[] | ActivityBrief[]`）
- [ ] TypeScript 编译无错误

### 5.3 交付标准

首页从新的嵌套结构中正确取数并渲染。

---

## 6. Phase 5 — 页面层 `src/pages/activity-zone/index.tsx`

### 6.1 Todo

- [ ] 移除 `import { getCompetitionZone }` 及相关类型
- [ ] 新增 `import { getHomeAggregation }`
- [ ] 重写 `useEffect`：从 `data.zones['competition']?.items` 取 Banner，从对应 ZoneSectionData 字段取列表数据
- [ ] 活动 tab：数据从 `zones['activity']?.activities` 取
- [ ] 就业 tab：数据从 `zones['employment']?.items` 取（或保留独立 `getJobList()`）

### 6.2 审计标准

- [ ] 不再引用 `CompetitionZoneResponse`、`getCompetitionZone`
- [ ] 各 tab 切换时能正确展示数据

### 6.3 交付标准

专区页从聚合数据正确提取竞赛/活动/就业信息。

---

## 7. Phase 6 — 页面层 `src/pages/mine/agreements.tsx`

### 7.1 Todo

- [ ] 非 mock 模式下 `getAgreements()` 返回空数组不崩溃
- [ ] 函数注释标注端点缺失状态

### 7.2 审计标准

- [ ] USE_MOCK=false 页面不崩溃
- [ ] 不会向不存在的端点发起请求导致 404

### 7.3 交付标准

两种模式下协议页均不报错。

---

## 8. Phase 7 — 全量审计

### 8.1 操作清单

- [ ] TypeScript 编译：`npx tsc --noEmit`（或 `run_verifiers` 执行 node 校验）
- [ ] 死代码清零验证：
  - `grep -r 'getCompetitionZone' src/` → 零匹配
  - `grep -r '/api/zones/cert' src/` → 零匹配
  - `grep -r '/api/zones/competition' src/` → 零匹配
  - `grep -r '/agreements' src/services/` → 仅出现在注释中
  - `grep -r 'homeData?.courses' src/` → 零匹配
- [ ] 类型导出一致性：`src/types/index.ts` 无废弃类型引用
- [ ] Barrel 导出清理：`src/services/dataService.ts` 无废弃函数导出
- [ ] `git diff` 逐文件确认变更范围

### 8.2 交付标准

- TypeScript 零编译错误
- 所有 API 调用路径与 `openapi.json` paths 一致
- 无死代码残留
- 降级代码（协议等）有明确注释

---

## 9. 路径存在性对照表

### 9.1 存在且一致的路径（23 个）

| 前端调用 | 后端路径 | 状态 |
|----------|----------|------|
| `POST /api/auth/login` | ✅ | — |
| `POST /api/auth/refresh` | ✅ | — |
| `POST /api/auth/logout` | ✅ | — |
| `GET /api/courses` | ✅ | 分页 `PaginatedData` |
| `GET /api/courses/{id}` | ✅ | — |
| `GET /api/courses/my` | ✅ | — |
| `GET /api/courses/categories` | ✅ | — |
| `POST /api/courses/enroll` | ✅ | — |
| `GET /api/orders` | ✅ | 分页 |
| `GET /api/orders/{id}` | ✅ | — |
| `POST /api/orders` | ✅ | 需验证 `OrderCreate` 字段 |
| `POST /api/payment/prepay` | ✅ | 字段名 `time_stamp` vs `timeStamp` |
| `POST /api/payment/callback` | ✅ | — |
| `GET /api/quiz/*` | ✅ | — |
| `GET /api/jobs` | ✅ | — |
| `POST /api/jobs/{id}/apply` | ✅ | — |
| `GET /api/training` | ✅ | 新端点，前端未对接 |
| `GET /api/competition/stats` | ✅ | — |
| `GET /api/competition/tracks` | ✅ | — |
| `POST /api/competition/signup` | ✅ | — |
| `GET /api/activities` | ✅ | — |
| `POST /api/activities/register` | ✅ | — |
| `POST /api/activities/{activity_id}/enroll` | ✅ | 参数名 `activity_id` |
| `POST /api/activities/{activity_id}/remind` | ✅ | 参数名 `activity_id` |
| `GET /api/tickets` **POST** | ✅ | — |
| `GET /api/share` **POST** | ✅ | — |
| `GET /api/quick-questions` | ✅ | — |
| `POST /api/upload` | ✅ | — |
| `GET /api/system/poster` | ✅ | — |
| `GET /api/cert/*` | ✅ | — |

### 9.2 不存在的路径（6 个）

| 前端调用 | 影响函数 | 处理策略 |
|----------|----------|----------|
| `GET /api/zones/cert` | — | 从 `/api/zones` 聚合提取 |
| `GET /api/zones/competition` | `getCompetitionZone()` | 删除函数，改从聚合提取 |
| `GET /api/zones/study` | — | 从 `/api/zones` 聚合提取 |
| `GET /api/zones/activity` | — | 从 `/api/zones` 聚合提取 |
| `GET /api/zones/employment` | — | 从 `/api/zones` 聚合提取 |
| `GET/POST/PUT /api/agreements` | `getAgreements()`、`createAgreement()`、`signAgreement()` | USE_MOCK 兜底 |

---

## 10. 执行顺序依赖图

```
Phase 1 (types/zone.ts)
  └── Phase 2 (zoneService.ts)
  │     └── Phase 4 (index page)
  │     └── Phase 5 (activity-zone page)
  └── Phase 3 (userService.ts)
        └── Phase 6 (agreements page)
        └── (profile/form pages — 由 Phase 3 驱动)
              └── Phase 7 (全量审计)
```

Phase 1 是最上游依赖，必须最先完成。Phase 2 和 3 可并行。Phase 4/5/6 依赖各自的服务层修改。Phase 7 在所有修改完成后执行。
