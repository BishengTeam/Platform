import assert from 'node:assert/strict'
import test from 'node:test'
import Taro from '@tarojs/taro'
import { clearAuthTokens, getToken, request, resetRequestStateForTest, setAuthTokens } from '../src/utils/request.ts'
import { subscribeAuth, getAuthSessionId, accessTokenExpired } from '../src/utils/authState.ts'
import { safeLoginTarget } from '../src/utils/loginTargets.ts'
import { navigateToUrl } from '../src/utils/navigation.ts'
import { cancelLogin, completeLogin, loginPageClosed, navigateWithLogin, parkProtectedTarget, pendingLogin, requireLogin } from '../src/utils/loginCoordinator.ts'

function setup() {
  resetRequestStateForTest()
  const storage = new Map(), calls = []
  Taro.getStorageSync = key => storage.get(key) || ''
  Taro.setStorageSync = (key, value) => storage.set(key, value)
  Taro.removeStorageSync = key => storage.delete(key)
  Taro.getStorageInfoSync = () => ({ keys: [...storage.keys()] })
  Taro.getCurrentPages = () => [{ route: 'pages/nisp/index', options: { level: '2' } }]
  for (const name of ['navigateTo', 'redirectTo', 'switchTab', 'navigateBack', 'showToast', 'showModal']) Taro[name] = async options => { calls.push([name, options]) }
  Taro.showLoading = () => {}; Taro.hideLoading = () => {}
  Taro.request = async options => { calls.push(['request', options]); return { statusCode: 200, data: { code: 0, data: [], message: 'ok' } } }
  loginPageClosed()
  return { storage, calls }
}

test('guest required requests stop locally; public requests omit all authorization without login navigation', async () => {
  const { calls } = setup()
  await assert.rejects(request({ url: '/api/orders', showLoading: false }), error => error.statusCode === 401)
  assert.equal(calls.length, 0)
  setAuthTokens('valid-token', 'refresh-token')
  await request({ url: '/api/zones', auth: 'public', header: { authorization: 'stale-token' }, showLoading: false })
  assert.equal(calls.length, 1)
  assert.equal(Object.keys(calls[0][1].header).some(key => key.toLowerCase() === 'authorization'), false)
  assert.equal(getToken(), 'valid-token')
})

test('public 401 never clears a valid login, refreshes a token, or opens a modal', async () => {
  const { calls } = setup(); setAuthTokens('valid-token', 'refresh-token')
  Taro.request = async options => { calls.push(['request', options]); return { statusCode: 401, data: {} } }
  await assert.rejects(request({ url: '/api/zones', auth: 'public', showLoading: false }), error => error.statusCode === 401)
  assert.equal(calls.length, 1); assert.equal(getToken(), 'valid-token')
})

test('optional expired login falls back to anonymous content without forcing login', async () => {
  const { calls } = setup(); setAuthTokens('expired', 'refresh')
  Taro.request = async options => {
    calls.push(['request', options])
    return options.header?.Authorization || options.url.includes('/auth/refresh')
      ? { statusCode: 401, data: { code: 40100, message: 'expired' } }
      : { statusCode: 200, data: { code: 0, data: ['public-item'] } }
  }
  const result = await request({ url: '/api/points-mall/items', auth: 'optional', showLoading: false })
  assert.deepEqual(result.data, ['public-item'])
  assert.equal(getToken(), '')
  assert.deepEqual(calls.map(call => call[0]), ['request', 'request', 'request'])
})

test('anonymous optional 401 does not repeatedly invalidate the guest session', async () => {
  const { calls } = setup()
  const session = getAuthSessionId()
  Taro.request = async options => { calls.push(['request', options]); return { statusCode: 401, data: { code: 40100 } } }
  await assert.rejects(request({ url: '/api/points-mall/items', auth: 'optional', showLoading: false }))
  assert.equal(getAuthSessionId(), session)
  assert.equal(calls.length, 2)
  assert.equal(calls.some(call => call[0] === 'showModal' || call[0] === 'navigateTo'), false)
})

test('login, logout and expiration publish state changes to mounted consumers', () => {
  setup(); let changed = 0
  const unsubscribe = subscribeAuth(() => changed++)
  setAuthTokens('access', 'refresh'); clearAuthTokens(); unsubscribe(); setAuthTokens('another', 'refresh')
  assert.equal(changed, 2)
})

test('concurrent personal actions open one login page; cancellation releases the lock and returns to browsing', async () => {
  const { calls } = setup()
  assert.deepEqual(await Promise.all([requireLogin('/pages/nisp/form?batch_id=7&level=2'), requireLogin('/pages/orders/index')]), [false, false])
  assert.equal(calls.filter(call => call[0] === 'navigateTo').length, 1)
  assert.equal(pendingLogin().target, '/pages/nisp/form?batch_id=7&level=2')
  assert.match(pendingLogin().purpose, /NISP二级/)
  Taro.getCurrentPages = () => [{ route: 'pages/nisp/index' }, { route: 'pages/auth/index' }]
  await cancelLogin()
  assert.equal(calls.at(-1)[0], 'navigateBack')
  assert.equal(pendingLogin(), null)
  await requireLogin('/pages/orders/index')
  assert.equal(calls.filter(call => call[0] === 'navigateTo').length, 2)
})

test('login page navigation failure releases the lock for retry', async () => {
  const { calls } = setup()
  Taro.navigateTo = async () => { throw new Error('navigation failed') }
  await requireLogin('/pages/orders/index')
  Taro.navigateTo = async options => { calls.push(['navigateTo', options]) }
  await requireLogin('/pages/orders/index')
  assert.equal(calls.at(-1)[0], 'navigateTo')
})

test('successful login rechecks the selected batch, restores only the page, and consumes the target', async () => {
  const { calls } = setup()
  await requireLogin('/pages/nisp/form?batch_id=7&level=2')
  setAuthTokens('access', 'refresh')
  Taro.request = async options => { calls.push(['request', options]); return { statusCode: 200, data: { code: 0, data: [{ id: 7, status: 'published', remaining_count: 10 }] } } }
  await completeLogin()
  assert.deepEqual(calls.at(-1), ['redirectTo', { url: '/pages/nisp/form?batch_id=7&level=2' }])
  assert.equal(calls.filter(call => call[0] === 'request' && call[1].method !== 'GET').length, 0)
  assert.equal(pendingLogin(), null)
  await completeLogin()
  assert.deepEqual(calls.at(-1), ['switchTab', { url: '/pages/index/index' }])
})

test('expired or offline batch returns to its public list without creating a registration', async () => {
  const { calls } = setup()
  await requireLogin('/pages/h3c/form?batch_id=7')
  setAuthTokens('access', 'refresh')
  await completeLogin()
  assert.deepEqual(calls.at(-1), ['redirectTo', { url: '/pages/h3c/index' }])
  assert.equal(calls.some(call => call[0] === 'showToast' && call[1].title.includes('不可报名')), true)
})

test('an inaccessible shared order returns to my orders after login without performing a payment', async () => {
  const { calls } = setup()
  await requireLogin('/pages/order-detail/index?order_id=42')
  setAuthTokens('access', 'refresh')
  Taro.request = async options => {
    calls.push(['request', options])
    assert.equal(options.header.Authorization, 'Bearer access')
    return { statusCode: 404, data: { code: 40300, message: '订单不存在' } }
  }
  await completeLogin()
  assert.deepEqual(calls.at(-1), ['redirectTo', { url: '/pages/orders/index' }])
  assert.equal(calls.filter(call => call[0] === 'request' && call[1].method !== 'GET').length, 0)
})

test('protected deep link parks on the real home with a safe continuation, without opening login', async () => {
  const { calls } = setup()
  Taro.getCurrentPages = () => [{ route: 'pages/renshe/form', options: { plan_id: '8' } }]
  await parkProtectedTarget()
  assert.deepEqual(calls, [['switchTab', { url: '/pages/index/index' }]])
  assert.equal(pendingLogin().target, '/pages/renshe/form?plan_id=8')
  assert.equal(pendingLogin().parked, true)
  await requireLogin(pendingLogin().target)
  assert.equal(calls.at(-1)[1].url, '/pages/auth/index')
})

test('deep-link restoration retains the complete approved parameter set and omits unrelated form data', async () => {
  setup()
  Taro.getCurrentPages = () => [{ route: 'pages/nisp/form', options: { batch_id: '8', level: '2', name: '不应保存的姓名' } }]
  await parkProtectedTarget()
  assert.equal(pendingLogin().target, '/pages/nisp/form?batch_id=8&level=2')
  Taro.getCurrentPages = () => [{ route: 'pages/quiz/prepare', options: { scopeType: 'module', scopeId: '12' } }]
  await parkProtectedTarget()
  assert.equal(pendingLogin().target, '/pages/quiz/prepare?scopeType=module&scopeId=12')
})

test('logged-in action continues without another login, and personal Tab targets use switchTab', async () => {
  const { calls } = setup(); setAuthTokens('access', 'refresh')
  await navigateWithLogin('/pages/profile/index')
  assert.deepEqual(calls, [['switchTab', { url: '/pages/profile/index' }]])
})

test('marketing clicks browse public pages directly and request login only for personal destinations', async () => {
  const { calls } = setup()
  await navigateToUrl('/pages/nisp/index?level=2')
  assert.deepEqual(calls, [['navigateTo', { url: '/pages/nisp/index?level=2' }]])
  await navigateToUrl('/pages/orders/index')
  assert.equal(calls.at(-1)[1].url, '/pages/auth/index')
})

test('expired access token opens login on the requested action without issuing a personal request', async () => {
  const { calls, storage } = setup()
  storage.set('auth_token', `header.${Buffer.from(JSON.stringify({ exp: 1 })).toString('base64url')}.signature`)
  assert.equal(accessTokenExpired(), true)
  await navigateWithLogin('/pages/orders/index')
  assert.deepEqual(calls, [['navigateTo', { url: '/pages/auth/index' }]])
})

test('token rotation preserves the account session, but logout invalidates pending refresh results', async () => {
  setup(); setAuthTokens('old-access', 'old-refresh')
  const session = getAuthSessionId()
  let finishRefresh
  Taro.request = async options => {
    if (options.url.includes('/auth/refresh')) return new Promise(resolve => { finishRefresh = resolve })
    return { statusCode: 401, data: { code: 40100 } }
  }
  const pending = request({ url: '/api/points', showLoading: false })
  while (!finishRefresh) await new Promise(resolve => setTimeout(resolve, 0))
  clearAuthTokens()
  finishRefresh({ statusCode: 200, data: { code: 0, data: { access_token: 'rotated', refresh_token: 'rotated-refresh' } } })
  await assert.rejects(pending, error => error.statusCode === 401)
  assert.equal(getToken(), '')
  assert.notEqual(getAuthSessionId(), session)
  setAuthTokens('new-access', 'new-refresh')
  const next = getAuthSessionId()
  setAuthTokens('rotation-access', 'rotation-refresh', false)
  assert.equal(getAuthSessionId(), next)
})

for (const target of ['https://evil.com', '//evil.com', '/pages/auth/index', '/pages/nisp/form?batch_id=1&name=张三', '/pages/nisp/form?batch_id=1&returnUrl=https%3A%2F%2Fevil.com', '/pages/orders/index?account_number=12345678', '/pages/nisp/form?batch_id=1&batch_id=2', '/pages/missing/index']) {
  test(`unsafe or personal return data is rejected: ${target}`, () => assert.equal(safeLoginTarget(target), null))
}
