import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveWebViewTarget } from '../src/utils/webviewUrl.ts'

for (const url of ['https://ztyyx.cn', 'https://www.ztyyx.cn/a?q=%26%2F', 'https://mp.weixin.qq.com/s?x=1', 'https://ztyyx.cn:443/a']) {
  test(`WebView accepts allowed HTTPS and decodes only the route wrapper: ${url}`, () => {
    assert.equal(resolveWebViewTarget(url), url)
    assert.equal(resolveWebViewTarget(encodeURIComponent(url)), url)
  })
}

for (const url of [undefined, '', '%', 'http://ztyyx.cn', 'https://evil.com', 'https://ztyyx.cn.evil.com', 'https://ztyyx.cn@evil.com', 'https://ztyyx.cn\\@evil.com', 'https://ztyyx.cn:8443/a', 'https://ztyyx.cn\n.evil.com', 'https://%7Atyyx.cn', 'javascript:alert(1)']) {
  test(`WebView rejects malformed or unauthorized target: ${url}`, () => assert.equal(resolveWebViewTarget(url), null))
}
