import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const file = (p) => new URL(`../src/${p}`, import.meta.url)

test('network banners and home card covers use native image components', async () => {
  const [zoneBanner, zoneStyle, homeCard, homeStyle] = await Promise.all([
    readFile(file('components/ZoneBanner/index.tsx'), 'utf8'),
    readFile(file('components/ZoneBanner/index.module.scss'), 'utf8'),
    readFile(file('components/HomeCard/index.tsx'), 'utf8'),
    readFile(file('components/HomeCard/index.module.scss'), 'utf8'),
  ])

  // 微信小程序 WXSS background-image 不支持网络 URL；运营网络图必须走 Image 组件。
  assert.match(zoneBanner, /<Image[\s\S]*?src=\{item\.image_url\}[\s\S]*?mode='aspectFill'/)
  assert.match(zoneStyle, /\.slideImage\s*\{[\s\S]*?position: absolute/)
  assert.match(homeCard, /<Image[\s\S]*?src=\{item\.cover_url\}[\s\S]*?mode='aspectFill'/)
  assert.match(homeStyle, /\.coverImage\s*\{[\s\S]*?position: absolute/)
  assert.equal(zoneBanner.includes('backgroundImage'), false)
  assert.equal(homeCard.includes('backgroundImage'), false)

  const slideStyle = zoneStyle.match(/\.slide\s*\{[\s\S]*?\}/)?.[0] ?? ''
  assert.doesNotMatch(slideStyle, /padding:/)
  assert.match(
    zoneStyle,
    /\.content\s*\{[\s\S]*?padding: \$spacing-lg \$spacing-3xl \$spacing-lg \$spacing-lg/,
  )
})
