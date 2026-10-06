import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const file = (p) => new URL(`../src/${p}`, import.meta.url)

test('practice assistant exposes the four vendor buttons with H3C default', async () => {
  const source = await readFile(file('pages/training/index.tsx'), 'utf8')

  // 甲方要求：默认 H3C，四个页签覆盖全部题库（none 归入「其他」）。
  assert.match(source, /DEFAULT_VENDOR_TAG: QuizVendorTag = 'h3c'/)
  // 小程序会按页面路径解析无前导斜杠的相对路径，logo 必须指向包根的 assets。
  assert.match(source, /tag: 'h3c', label: 'H3C', logo: '\/assets\/vendor\/h3c\.png'/)
  assert.match(source, /tag: 'nisp', label: 'NISP', logo: '\/assets\/vendor\/nisp\.png'/)
  assert.match(source, /tag: 'sangfor', label: '深信服', logo: '\/assets\/vendor\/sangfor\.png'/)
  assert.match(source, /tag: 'none', label: '其他'/)
  assert.doesNotMatch(source, /logo: 'assets\/vendor\//)

  // 厂商按钮只做筛选并自动选中该厂商第一个可用题库；不自动跳到其他厂商。
  assert.match(source, /item\.vendor_tag === activeVendor/)
  assert.match(source, /item\.vendor_tag === DEFAULT_VENDOR_TAG/)
  assert.match(source, /该厂商题库筹备中/)
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

  // 空状态与数据状态互斥；空状态不再渲染禁用按钮和数据面板。
  assert.match(source, /vendorLibraries\.length === 0 \? \(/)
  assert.match(source, /styles\.emptyIllustration/)
  assert.match(source, /handleSwitchToAvailableVendor/)
  assert.match(source, /切换到其他厂商/)
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
