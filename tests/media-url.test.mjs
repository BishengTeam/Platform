import assert from 'node:assert/strict'
import test from 'node:test'

process.env.TARO_APP_API_BASE = 'https://api.ztyyx.cn/'
const { resolveMediaUrl } = await import('../src/utils/media.ts')

test('backend media relative urls are prefixed with the api base', () => {
  assert.equal(
    resolveMediaUrl('/api/media/bd804f8ede9346c4b704e0c415d3e275.png'),
    'https://api.ztyyx.cn/api/media/bd804f8ede9346c4b704e0c415d3e275.png',
  )
})

test('legacy admin-host media urls are rewritten to the api base', () => {
  assert.equal(
    resolveMediaUrl('https://admin.ztyyx.cn/api/media/bd804f8ede9346c4b704e0c415d3e275.png'),
    'https://api.ztyyx.cn/api/media/bd804f8ede9346c4b704e0c415d3e275.png',
  )
})

test('third-party absolute urls pass through untouched', () => {
  const ossUrl = 'https://materials-20260909-1.oss-cn-chengdu.aliyuncs.com/course/a/covers/b.jpg?sig=1'
  const externalBannerUrl = 'https://dummyimage.com/750x300/1677FF/FFFFFF.png?text=Banner'

  assert.equal(resolveMediaUrl(ossUrl), ossUrl)
  assert.equal(resolveMediaUrl(externalBannerUrl), externalBannerUrl)
})

test('empty values resolve to an empty string for fallback rendering', () => {
  assert.equal(resolveMediaUrl(''), '')
  assert.equal(resolveMediaUrl(null), '')
  assert.equal(resolveMediaUrl(undefined), '')
})
