import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const pageFile = new URL('../src/pages/mine/share.tsx', import.meta.url)
const stringsFile = new URL('../src/constants/strings.ts', import.meta.url)
const serviceFile = new URL('../src/services/userService.ts', import.meta.url)

test('share page fetches backend-configured poster and previews it', async () => {
  const source = await readFile(pageFile, 'utf8')
  assert.match(source, /getSharePoster\(\)/)
  assert.match(source, /Taro\.previewImage\(\{ urls: \[resolveMediaUrl\(posterUrl\)\] \}\)/)
  // 旧的假实现必须消失：1 秒后假装"海报已保存到相册"
  assert.doesNotMatch(source, /海报已保存到相册/)
  assert.doesNotMatch(source, /正在生成海报/)
})

test('poster entry is disabled (grey) until backend poster is loaded', async () => {
  const source = await readFile(pageFile, 'utf8')
  assert.match(source, /posterLoaded/)
  assert.match(source, /posterEnabled = posterLoaded && Boolean\(posterUrl\)/)
  assert.match(source, /cardDisabled/)
})

test('share app card and bottom button forward via openType share', async () => {
  const source = await readFile(pageFile, 'utf8')
  // 微信小程序无法用 JS 拉起转发面板，必须用 open-type='share' 按钮
  assert.match(source, /openType='share'/g)
  assert.match(source, /className=\{`\$\{styles\.card\} \$\{styles\.cardAsButton\}`\} openType='share'/)
  assert.match(source, /className=\{styles\.shareBtn\} openType='share'/)
})

test('share poster copy no longer claims client-side generation', async () => {
  const source = await readFile(stringsFile, 'utf8')
  assert.match(source, /MINE_SHARE_POSTER_DESC: '保存推广海报到相册'/)
  assert.doesNotMatch(source, /生成专属推广海报/)
})

test('share poster service hits GET /api/share/poster', async () => {
  const source = await readFile(serviceFile, 'utf8')
  assert.match(source, /export async function getSharePoster/)
  assert.match(source, /'\/api\/share\/poster'/)
})
