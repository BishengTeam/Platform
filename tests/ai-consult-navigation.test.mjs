import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const pageFile = new URL('../src/pages/ai-consult/index.tsx', import.meta.url)

test('ai zone cards switch to tab pages instead of navigateTo', async () => {
  const source = await readFile(pageFile, 'utf8')
  const handler = source.match(/const handleCardTap = useCallback\(\(zoneKey: string\) => \{[\s\S]*?\n  \}, \[\]\)/)?.[0] ?? ''
  assert.ok(handler, 'handleCardTap should exist')
  // tabBar 页面必须 switchTab，否则微信小程序静默失败
  assert.match(handler, /TAB_BAR_CONFIG\.some\(t => t\.key === path\)/)
  assert.match(handler, /Taro\.switchTab\(/)
  // ?tab=competition 参数需沿用 activityZoneTab storage 约定传给目标页
  assert.match(handler, /Taro\.setStorageSync\('activityZoneTab', tab\)/)
  // 非 tabBar 页（如认证报名）保持 navigateTo
  assert.match(handler, /Taro\.navigateTo\(\{ url: route \}\)/)
})
