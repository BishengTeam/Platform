import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

// ── 赛事详情页：海报长图 + 附件入口 ─────────────────────────────

test('competition detail page renders poster full-width and links to attachment page', async () => {
  const source = await readFile(
    new URL('../src/pages/competition/detail.tsx', import.meta.url),
    'utf8',
  )

  // 详情数据必须走详情接口（列表接口不携带海报与附件）
  assert.match(source, /getCompetitionDetail\(competitionId\)/)
  assert.doesNotMatch(source, /getCompetitionList\(\)/)

  // 海报完整展示（widthFix），无海报时回退封面
  assert.match(source, /competition\.poster_url \?/)
  assert.match(source, /className=\{styles\.poster\}[^\n]*mode='widthFix'/)

  // 附件入口跳独立子页面
  assert.match(source, /pages\/competition\/attachment\?id=\$\{competitionId\}&att=\$\{index\}/)
})

// ── 附件子页面：只读页图，不提供任何保存/转发入口 ───────────────

test('competition attachment page is registered and free of download affordances', async () => {
  const config = await readFile(new URL('../src/app.config.ts', import.meta.url), 'utf8')
  assert.match(config, /root: 'pages\/competition',\s*\n\s*pages: \['detail', 'attachment'\]/)

  const source = await readFile(
    new URL('../src/pages/competition/attachment.tsx', import.meta.url),
    'utf8',
  )

  // 数据自详情接口重取，分享/直进子页面不丢数据
  assert.match(source, /getCompetitionDetail\(competitionId\)/)
  assert.match(source, /resolveMediaUrl\(page\)/)

  // 防下载边界：不允许出现预览大图、文档打开、长按菜单、相册保存、剪贴板
  for (const banned of [
    'previewImage',
    'openDocument',
    'showMenuByLongpress',
    'saveImageToPhotosAlbum',
    'setClipboardData',
  ]) {
    assert.equal(source.includes(banned), false, `attachment page must not use ${banned}`)
  }

  // 明示查阅边界文案
  assert.match(source, /仅供在线查阅/)
})
