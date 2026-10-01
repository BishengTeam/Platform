import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const file = (p) => new URL(`../src/${p}`, import.meta.url)

test('practice assistant exposes the four vendor buttons with H3C default', async () => {
  const source = await readFile(file('pages/training/index.tsx'), 'utf8')

  // 甲方要求：默认 H3C，四个页签覆盖全部题库（none 归入「其他」）。
  assert.match(source, /DEFAULT_VENDOR_TAG: QuizVendorTag = 'h3c'/)
  assert.match(source, /tag: 'h3c', label: 'H3C', logo: 'assets\/vendor\/h3c\.png'/)
  assert.match(source, /tag: 'nisp', label: 'NISP', logo: 'assets\/vendor\/nisp\.png'/)
  assert.match(source, /tag: 'sangfor', label: '深信服', logo: 'assets\/vendor\/sangfor\.png'/)
  assert.match(source, /tag: 'none', label: '其他'/)

  // 厂商按钮只做筛选并自动选中该厂商第一个可用题库；不自动跳到其他厂商。
  assert.match(source, /item\.vendor_tag === activeVendor/)
  assert.match(source, /item\.vendor_tag === DEFAULT_VENDOR_TAG/)
  assert.match(source, /该厂商暂无可练习题库/)
})

test('vendor logo assets ship with the mini program package', async () => {
  const config = await readFile(file('../config/index.ts'), 'utf8')
  assert.match(config, /sourceRoot: 'src'/)
  for (const logo of ['h3c.png', 'nisp.png', 'sangfor.png']) {
    const stat = await readFile(file(`assets/vendor/${logo}`)).then(() => true, () => false)
    assert.equal(stat, true, `assets/vendor/${logo} 缺失，厂商按钮会裂图`)
  }
})
