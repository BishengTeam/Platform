## 1. 核心原则

### 1.1 单一职责

每个文件、每个组件、每个函数只做一件事。判断标准：
- 能用一句话描述其职责，且这句话中没有"和"字
- 修改一个功能时，不需要修改不相关的文件

### 1.2 依赖方向

```
Page → Component (UI) / Hook (logic) / Service (API)
不允许: Component → Page
不允许: Component → HTTP Request/Response 对象
不允许: pages/A/components/* → pages/B/components/*（除非该组件在 shared/ 中）
```

### 1.3 代码即文档

- 命名自解释，不需要注释说"做什么"
- 仅在 WHY 不显而易见时写注释（边界条件、性能考量、Bug 规避）
- 不为类型写注释 — TypeScript 类型定义已经足够

---

## 2. 命名规范

### 2.1 文件与目录

| 类型 | 规范 | 示例 |
|------|------|------|
| 目录 | kebab-case | `activity-zone/`、`competition-zone/` |
| 组件文件 | index.tsx / index.module.scss | `components/AuthGuard/index.tsx` |
| Hook 文件 | camelCase，use 前缀 | `useAuth.ts`、`useZonePage.ts` |
| 工具/常量/类型文件 | camelCase | `storage.ts`、`icons.ts` |
| 页面文件 | index.tsx / index.module.scss | `pages/index/index.tsx` |

### 2.2 代码标识符

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件名 | PascalCase | `AuthGuard`、`FormInput` |
| 函数/变量 | camelCase | `handleSubmit`、`userList` |
| 常量 | UPPER_SNAKE | `API_BASE_URL`、`MAX_RETRY` |
| 类型/接口 | PascalCase，不加 `I` 前缀 | `RegistrationForm`、`ExamInfo` |
| CSS Module 引用 | camelCase | `styles.headerTitle` |

### 2.3 命名原则

- **布尔值**以 `is` / `has` / `should` 开头：`isLoading`、`hasError`
- **事件处理函数**以 `handle` 开头：`handleClick`、`handleChange`
- **回调 props**以 `on` 开头：`onSubmit`、`onClose`
- **避免缩写**，除非是领域内公认的缩写（如 `id`、`url`）

---

## 3. 目录结构

### 3.1 硬性约束

- `pages/A/` 不允许引用 `pages/B/` 下的组件或模块
- `components/` 中的组件不包含业务请求逻辑，只接收 props
- `hooks/` 放通用 Hook，页面专属 Hook 放在对应页面目录内
- `types/` 只放业务领域类型，组件 Props 类型跟随组件文件
- `constants/` 只放常量与 mock 数据，不放可执行逻辑

---

## 4. 组件规范

### 4.1 目录结构

每个组件一个目录，包含：

```
ComponentName/
├── index.tsx            # 组件逻辑（必需）
└── index.module.scss    # 组件样式（按需）
```

### 4.2 组件化优先

- **所有可复用的 UI 片段必须抽取为独立组件**，禁止在页面中重复编写相同或相似的 JSX 结构
- **优先复用已有组件**，新增功能前先检查 `components/` 目录下是否存在可用的通用组件
- 跨页面使用的组件放在 `src/components/` 中，页面内复用的组件放在对应页面的 `components/` 子目录中
- 通过 Props 控制组件的变体行为，而非为每种变体创建新组件

### 4.3 编写规则

- 优先使用函数组件 + Hooks，不使用 Class 组件
- Props 类型内联定义在组件文件中，不单独导出（除非被多处引用）
- 使用具名导出
- 组件内不直接调用 API，通过 Hook 或 Service 层获取数据
- 避免在 render 中创建内联函数/对象（提取为变量或使用 `useCallback` / `useMemo`）

### 4.4 示例模板

```tsx
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';

interface Props {
  title: string;
  onClose?: () => void;
}

export function ExampleCard({ title, onClose }: Props) {
  return (
    <View className={styles.card}>
      <Text>{title}</Text>
    </View>
  );
}
```

---

## 5. TypeScript 规范

### 5.1 类型定义

- `interface` 优先于 `type`（对于对象结构）
- 类型导入使用 `import type { ... }`
- 不允许使用 `any`，未知类型使用 `unknown`
- 不为类型定义写注释 —— 类型名本身就说明含义

### 5.2 编译配置

项目已启用以下严格检查，不允许关闭：

- `strictNullChecks: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`

---

## 6. 样式规范

### 6.1 CSS Modules

- 所有组件/页面样式使用 SCSS Modules（`*.module.scss`）
- 全局设计令牌（颜色、间距、字号等）定义在 `styles/_variables.scss`
- 不写内联样式，除非值是动态计算得出的
- 遵循 NutUI 设计变量体系，优先使用组件库内置样式

### 6.2 样式文件约定

```scss
// 只在组件/页面目录下创建 module.scss
// 全局样式放在 src/styles/ 中
@import '@/styles/variables';

.card {
  padding: $spacing-md;
  border-radius: $radius-sm;
}
```

---

## 7. Git 提交规范

### 7.1  规则

- 不提交 `console.log`、注释掉的代码、未使用的变量

---

## 8. 提交前自查清单

- [ ] TypeScript 无报错（`tsc --noEmit`）
- [ ] 无 `console.log`
- [ ] 无硬编码的中文字符串（应放在 `constants/strings.ts`）
- [ ] 无未使用的 import
- [ ] 组件可被独立复用时，Props 接口清晰
- [ ] 未重复编写已有组件可实现的 UI 片段，优先复用而非重写
- [ ] 样式变更仅影响目标组件，未破坏其他页面
- [ ] 遵循依赖方向：Page → Component / Hook / Service
