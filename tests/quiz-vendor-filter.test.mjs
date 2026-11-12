import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { safeLoginTarget } from '../src/utils/loginTargets.ts'

const file = (p) => new URL(`../src/${p}`, import.meta.url)

test('library selector page exposes the four vendors with Sangfor default', async () => {
  const source = await readFile(file('pages/quiz/libraries.tsx'), 'utf8')

  // 默认深信服（SCSA-T 题库上线），四个厂商覆盖全部题库（none 归入「其他」）。
  assert.match(source, /DEFAULT_VENDOR_TAG: QuizVendorTag = 'sangfor'/)
  // 小程序会按页面路径解析无前导斜杠的相对路径，logo 必须指向包根的 assets。
  assert.match(source, /tag: 'h3c', label: 'H3C', logo: '\/assets\/vendor\/h3c\.png'/)
  assert.match(source, /tag: 'nisp', label: 'NISP', logo: '\/assets\/vendor\/nisp\.png'/)
  assert.match(source, /tag: 'sangfor', label: '深信服', logo: '\/assets\/vendor\/sangfor\.png'/)
  assert.match(source, /tag: 'none', label: '其他'/)
  assert.doesNotMatch(source, /logo: 'assets\/vendor\//)

  // 右侧列表按厂商本地过滤；空厂商显示筹备中文案。
  assert.match(source, /item\.vendor_tag === activeVendor/)
  assert.match(source, /该厂商题库筹备中/)
  // 点题库：先写续练记忆态，再带库名跳 prepare（未激活库由 prepare 内联输码解锁）。
  assert.match(source, /rememberScope\(/)
  assert.match(source, /ROUTES\.QUIZ_PREPARE\}\??scopeType=library/)
})

test('scopeName whitelist accepts real library names and still blocks junk', () => {
  const urlOf = (name) => `/pages/quiz/prepare?scopeType=library&scopeId=7&scopeName=${encodeURIComponent(name)}`

  // 2026-11-12 生产在库题库实名回归：H3C 库含「/」，白名单不收会让已登录点击静默回
  // 首页（navigateWithLogin 的 || HOME 兜底）；「.」「：」为同类命名（如 V4.0）预留。
  const realNames = [
    'SCSA-T深信服安全技术认证工程师',
    'GB0-192/H3C认证路由交换网络工程师',
    'NISP一级(安全运营方向)国家信息安全水平考试',
    '全国AI安全竞赛专题训练',
    'HCIA-Datacom V4.0：新版题库',
  ]
  for (const name of realNames) {
    const safe = safeLoginTarget(urlOf(name))
    assert.ok(safe, `库名被 scopeName 白名单误拒（会静默跳首页）: ${name}`)
    assert.equal(decodeURIComponent(/scopeName=([^&]+)/.exec(safe)?.[1] ?? ''), name, '出站 scopeName 须按 encodeURIComponent 回填')
  }

  // 仍然拦截：超长与控制符/HTML 字符。
  assert.equal(safeLoginTarget(urlOf('库'.repeat(61))), null)
  assert.equal(safeLoginTarget(urlOf('<script>alert(1)</script>')), null)
})

test('training home replaces the action-sheet flow with the remembered scope card', async () => {
  const source = await readFile(file('pages/training/index.tsx'), 'utf8')

  // 2026-11-12 改版：厂商页签与 ActionSheet 选题已被独立题库列表页取代。
  assert.doesNotMatch(source, /showActionSheet|QuizCategoryPicker|VENDOR_TABS/)
  assert.match(source, /ROUTES\.QUIZ_LIBRARIES/)
  // 记忆态三件套：读取、写入、失效清理。
  assert.match(source, /readRememberedScope\(\)/)
  assert.match(source, /rememberScope\(/)
  assert.match(source, /clearRememberedScope\(\)/)
})

test('prepare page switches scope inside the current library', async () => {
  const source = await readFile(file('pages/quiz/prepare.tsx'), 'utf8')

  // 范围条可点，弹出既有 QuizCategoryPicker，只在当前库内切换整库/模块/知识点。
  assert.match(source, /切换练习范围/)
  assert.match(source, /<QuizCategoryPicker/)
  assert.match(source, /getQuizLibrary\(current\.library_id\)/)
  // 切换范围后同步续练记忆态，学习 tab 返回时展示最新范围。
  assert.match(source, /rememberScope\(/)
})

test('vendor logo assets ship with the mini program package', async () => {
  const config = await readFile(file('../config/index.ts'), 'utf8')
  assert.match(config, /sourceRoot: 'src'/)
  assert.match(config, /from: 'src\/assets\/vendor\/', to: 'dist\/assets\/vendor\/'/)
  for (const logo of ['h3c.png', 'nisp.png', 'sangfor.png']) {
    const stat = await readFile(file(`assets/vendor/${logo}`)).then(() => true, () => false)
    assert.equal(stat, true, `assets/vendor/${logo} 缺失，厂商按钮会裂图`)
  }
})

test('practice assistant body follows the Swiss card redesign', async () => {
  const [source, style] = await Promise.all([
    readFile(file('pages/training/index.tsx'), 'utf8'),
    readFile(file('pages/training/index.module.scss'), 'utf8'),
  ])

  // 在线课程下线后学习页只保留练习助手，不再保留孤立业务 Tab。
  assert.match(source, /<PageHeader title=\{STRINGS\.STUDY_TITLE\}/)
  assert.doesNotMatch(source, /MAIN_TABS|TagFilter/)

  // 空状态与数据状态互斥；记忆态范围卡驱动统计与续练入口。
  assert.match(source, /quizLibraries\.length === 0 \? \(/)
  assert.match(source, /styles\.emptyIllustration/)
  assert.match(source, /styles\.statsGrid/)
  assert.match(source, /styles\.practiceCta/)

  // 快捷入口固定四列，并保持完整业务命名。
  assert.match(source, /label: '模拟考试'/)
  assert.match(source, /label: '练习历史'/)
  assert.match(source, /label: '错题本'/)
  assert.match(source, /label: '我的收藏'/)
  assert.doesNotMatch(source, /styles\.quickCard/)
  assert.doesNotMatch(source, /styles\.quickIconUnderlay/)
  assert.doesNotMatch(source, /styles\.quickIconForeground/)
  assert.match(source, /iconBg: '#EFF6FF', iconColor: '#2563EB'/)
  assert.match(source, /iconBg: '#F5F3FF', iconColor: '#7C3AED'/)
  assert.match(source, /iconBg: '#FEF2F2', iconColor: '#DC2626'/)
  assert.match(source, /iconBg: '#FEFCE8', iconColor: '#EA580C'/)

  assert.match(style, /background: #F7F8FA/)
  assert.match(style, /border: 1PX solid #F1F5F9/)
  assert.match(style, /grid-template-columns: repeat\(3, 1fr\)/)
  assert.match(style, /grid-template-columns: repeat\(4, 1fr\)/)
  assert.match(style, /\.quickItem\s*\{[^}]*gap:\s*16px/)
  assert.match(style, /background: #165DFF/)
  assert.match(style, /font-family: 'DIN Alternate'/)
  assert.doesNotMatch(style, /\.quickCard/)
  assert.doesNotMatch(style, /\.quickIconUnderlay/)
  assert.doesNotMatch(style, /\.quickIconForeground/)
})
