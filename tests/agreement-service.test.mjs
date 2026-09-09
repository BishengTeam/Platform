import assert from 'node:assert/strict'
import test from 'node:test'
import Taro from '@tarojs/taro'
import { clearAuthTokens, resetRequestStateForTest, setAuthTokens } from '../src/utils/request.ts'
import {
  getAgreementTemplate,
  acceptAgreements,
  getMyAgreementAcceptances,
  hasAcceptedLatest,
  acceptLoginAgreements,
} from '../src/services/agreementService.ts'

function envelope(data, code = 0, message = 'ok') {
  return { statusCode: 200, data: { code, data, message }, header: {}, cookies: [], errMsg: 'ok' }
}

function installStorage() {
  const storage = new Map()
  Taro.getStorageSync = key => storage.get(key) ?? ''
  Taro.setStorageSync = (key, value) => storage.set(key, value)
  Taro.removeStorageSync = key => storage.delete(key)
  Taro.getStorageInfoSync = () => ({ keys: [...storage.keys()] })
  return storage
}

function installTaroStubs() {
  Taro.showToast = () => undefined
  Taro.showLoading = () => undefined
  Taro.hideLoading = () => undefined
}

test('agreement service hits backend routes and maps acceptances', async () => {
  resetRequestStateForTest()
  installStorage()
  installTaroStubs()
  const calls = []
  Taro.request = async options => {
    calls.push(options)
    if (options.url.includes('/api/agreement-templates')) {
      return envelope({ type: 'identity_auth', title: '实名信息处理授权协议', content: '正文', version: 2 })
    }
    if (options.url.includes('/api/agreement-acceptances') && options.method === 'POST') {
      return envelope([
        { id: 7, type: 'identity_auth', title: '实名信息处理授权协议', version: 2, accepted_at: '2026-09-09T10:00:00Z' },
      ])
    }
    return envelope([
      { id: 6, type: 'user_terms', title: '用户服务协议', version: 1, accepted_at: '2026-09-08T10:00:00Z' },
      { id: 7, type: 'identity_auth', title: '实名信息处理授权协议', version: 1, accepted_at: '2026-09-09T10:00:00Z' },
    ])
  }
  setAuthTokens('access-token', 'refresh-token')

  const template = await getAgreementTemplate('identity_auth')
  assert.equal(template.version, 2)
  assert.equal(calls[0].url.includes('/api/agreement-templates'), true)
  assert.equal(calls[0].data.type, 'identity_auth')

  const accepted = await acceptAgreements([{ type: 'identity_auth', version: 2 }])
  assert.equal(accepted.length, 1)
  assert.equal(accepted[0].id, '7')
  assert.equal(accepted[0].acceptedAt, '2026-09-09T10:00:00Z')
  assert.deepEqual(calls[1].data.items, [{ type: 'identity_auth', version: 2 }])

  const mine = await getMyAgreementAcceptances()
  assert.equal(mine.length, 2)
  assert.equal(mine[0].title, '用户服务协议')

  // 已签 v1 < 生效 v2 → 视为未签署
  assert.equal(await hasAcceptedLatest('identity_auth'), false)
  clearAuthTokens()
})

test('hasAcceptedLatest matches active version and tolerates missing template', async () => {
  resetRequestStateForTest()
  installStorage()
  installTaroStubs()
  Taro.request = async options => {
    if (options.url.includes('/api/agreement-templates')) {
      if (options.data?.type === 'privacy') return envelope(null, 40300, '协议模板 不存在')
      return envelope({ type: 'identity_auth', title: 't', content: 'c', version: 3 })
    }
    return envelope([
      { id: 9, type: 'identity_auth', title: 't', version: 3, accepted_at: '2026-09-09T08:00:00Z' },
    ])
  }
  setAuthTokens('a', 'b')

  assert.equal(await hasAcceptedLatest('identity_auth'), true)
  // 模板未配置 → 放行（后端兜底）
  assert.equal(await hasAcceptedLatest('privacy'), true)
  clearAuthTokens()
})

test('acceptLoginAgreements records only configured templates', async () => {
  resetRequestStateForTest()
  installStorage()
  installTaroStubs()
  const posts = []
  Taro.request = async options => {
    if (options.url.includes('/api/agreement-templates')) {
      if (options.data?.type === 'privacy') return envelope(null, 40300, '协议模板 不存在')
      return envelope({ type: 'user_terms', title: '用户服务协议', content: 'c', version: 1 })
    }
    posts.push(options.data)
    return envelope([])
  }
  setAuthTokens('a', 'b')

  await acceptLoginAgreements()
  assert.deepEqual(posts, [{ items: [{ type: 'user_terms', version: 1 }] }])
  clearAuthTokens()
})
