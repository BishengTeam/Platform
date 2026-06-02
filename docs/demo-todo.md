# 演示改动 TODO

## P0 — 核心：AI 对话增强

### 1. 扩展卡片类型 `src/types/message.ts`
- [x] 新增 `ChatExamCard` 类型：`{ type: 'exam', title, description, price, tag }`
- [x] 新增 `ChatCourseCard` 类型：`{ type: 'course', title, description, duration, tag }`
- [x] 新增 `ChatZoneCard` 类型：`{ type: 'zone_link', zoneName, zoneKey, description }`
- [x] `Message.card` 改为联合类型 `ChatCard`

### 2. 丰富 AI 回复文案 `src/constants/strings.ts`
- [x] 替换 `INDEX_AI_DEFAULT` 为真实回复（不再出现"这是一个模拟的AI回复"）
- [x] 新增 `INDEX_AI_EXAM` — 考试报名咨询回复
- [x] 新增 `INDEX_AI_COURSE` — 课程推荐回复
- [x] 新增 `INDEX_AI_COMPETITION` — 竞赛查询回复
- [x] 新增 `INDEX_AI_ACTIVITY` — 活动查询回复
- [x] 新增 `INDEX_AI_EMPLOYMENT` — 就业咨询回复
- [x] 保留 `INDEX_AI_TEACHER` — 讲师对接（已有）

### 3. 多轮对话逻辑 `src/pages/index/index.tsx`
- [x] 关键词匹配扩展：认证、报名、考试、费用 → 考试回复 + ChatExamCard
- [x] 关键词匹配：课程、学习、培训、资料 → 课程回复 + ChatCourseCard
- [x] 关键词匹配：竞赛、比赛、大赛 → 竞赛回复 + ChatZoneCard
- [x] 关键词匹配：活动、讲座、直播 → 活动回复 + ChatZoneCard
- [x] 关键词匹配：就业、工作、招聘、实习 → 就业回复 + ChatZoneCard
- [x] 关键词匹配：老师、讲师、联系方式 → 讲师名片（已有，保留）
- [x] 无匹配时的默认回复改为引导性文案

### 4. ChatArea 渲染富文本卡片 `src/components/ChatArea/index.tsx`
- [x] `ChatExamCard` 渲染：标题 + 描述 + 标签 + 价格 + 跳转按钮
- [x] `ChatCourseCard` 渲染：标题 + 描述 + 时长 + 标签 + 跳转按钮
- [x] `ChatZoneCard` 渲染：专区名 + 描述 + 跳转按钮
- [x] 新增对应 scss 样式 `src/components/ChatArea/index.module.scss`

---

## P1 — 辅助优化

### 5. 快捷问题优化 `src/constants/mock/home.ts`
- [x] 替换快捷问题为演示用问题：
  - "如何报名 H3CNE 认证？"
  - "有哪些学习课程推荐？"
  - "最近有什么竞赛？"
  - "帮我推荐就业方向"

### 6. AI 欢迎语优化 `src/constants/mock/home.ts`
- [x] 首条欢迎语改为更自然的版本：自我介绍 + 主动引导提问

---

## P2 — 可选

### 7. 演示重置按钮 `src/pages/index/index.tsx`
- [ ] 页面右下角添加小按钮（仅 `process.env.NODE_ENV === 'development'` 时显示）
- [ ] 点击后清空对话 → 恢复 initialMessages → 显示 WelcomeCard

### 8. 整体走查
- [ ] 检查所有页面 visual 效果
- [ ] 确认 5 个专区页面数据展示正常
- [ ] 确认订单/证书/通知页面正常
- [ ] 确认 TabBar 切换、页面跳转正常
