import assert from 'node:assert/strict'
import test from 'node:test'
import Taro from '@tarojs/taro'
import {
  clearAuthTokens,
  getRefreshToken,
  getToken,
  request,
  resetRequestStateForTest,
  restoreAuthSession,
  setAuthTokens,
} from '../src/utils/request.ts'

function installTaroMock(responder) {
  const storage = new Map()
  const calls = []
  let modalCount = 0
  let toastCount = 0
  Taro.getStorageSync = key => storage.get(key) ?? ''
  Taro.setStorageSync = (key, value) => storage.set(key, value)
  Taro.removeStorageSync = key => storage.delete(key)
  Taro.getStorageInfoSync = () => ({ keys: [...storage.keys()] })
  Taro.showLoading = () => undefined
  Taro.hideLoading = () => undefined
  Taro.showModal = () => { modalCount += 1; return Promise.resolve({}) }
  Taro.showToast = () => { toastCount += 1; return Promise.resolve({}) }
  Taro.reLaunch = () => Promise.resolve({})
  Taro.request = async options => {
    calls.push(options)
    return responder(options, calls.length)
  }
  return {
    storage,
    calls,
    modalCount: () => modalCount,
    toastCount: () => toastCount,
  }
}

function response(statusCode, code, data = null, message = '') {
  return { statusCode, data: { code, data, message }, header: {}, cookies: [], errMsg: 'ok' }
}

test('startup authentication restoration is single-flight and rotates both tokens', async () => {
  resetRequestStateForTest()
  const env = installTaroMock(async options => {
    assert.equal(options.url.endsWith('/api/auth/refresh'), true)
    await new Promise(resolve => setTimeout(resolve, 5))
    return response(200, 0, { access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 3600 })
  })
  env.storage.set('auth_refresh_token', 'old-refresh')
  const results = await Promise.all([restoreAuthSession(), restoreAuthSession(), restoreAuthSession()])
  assert.deepEqual(results, [true, true, true])
  assert.equal(env.calls.length, 1)
  assert.equal(getToken(), 'new-access')
  assert.equal(getRefreshToken(), 'new-refresh')
  clearAuthTokens()
})

test('parallel 401 responses share one refresh and retry with the rotated access token', async () => {
  resetRequestStateForTest()
  const env = installTaroMock(async options => {
    if (options.url.endsWith('/api/auth/refresh')) {
      await new Promise(resolve => setTimeout(resolve, 5))
      return response(200, 0, { access_token: 'access-2', refresh_token: 'refresh-2', expires_in: 3600 })
    }
    if (options.header?.Authorization === 'Bearer access-2') return response(200, 0, { ok: true })
    return response(401, 40100, null, '登录已过期')
  })
  setAuthTokens('access-1', 'refresh-1')
  const [first, second] = await Promise.all([
    request({ url: '/api/quiz/stats', showLoading: false }),
    request({ url: '/api/quiz/checkin', showLoading: false }),
  ])
  assert.deepEqual(first.data, { ok: true })
  assert.deepEqual(second.data, { ok: true })
  assert.equal(env.calls.filter(call => call.url.endsWith('/api/auth/refresh')).length, 1)
  clearAuthTokens()
})

test('failed refresh clears quiz caches, shows one modal and no UNAUTHORIZED toast', async () => {
  resetRequestStateForTest()
  const env = installTaroMock(async options => options.url.endsWith('/api/auth/refresh')
    ? response(401, 40100, null, '刷新失败')
    : response(401, 40100, null, '登录已过期'))
  setAuthTokens('expired-access', 'expired-refresh')
  env.storage.set('quiz_active_exam_id', 7)
  await assert.rejects(
    request({ url: '/api/quiz/stats', showLoading: false }),
    /UNAUTHORIZED/,
  )
  assert.equal(getToken(), '')
  assert.equal(getRefreshToken(), '')
  assert.equal(env.storage.has('quiz_active_exam_id'), false)
  assert.equal(env.modalCount(), 1)
  assert.equal(env.toastCount(), 0)
})
