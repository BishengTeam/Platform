import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import test from 'node:test'
import Taro from '@tarojs/taro'
import { FEATURES } from '../src/constants/features.ts'
import {
  goBackToActivityZone,
  navigateToUrl,
  safeNavigateBack,
} from '../src/utils/navigation.ts'

function installNavigationMock(pages, navigateBackShouldFail = false) {
  const calls = []
  const storage = new Map()

  Taro.getCurrentPages = () => pages
  Taro.navigateBack = async options => {
    calls.push(['navigateBack', options])
    if (navigateBackShouldFail) throw new Error('navigateBack failed')
  }
  Taro.switchTab = async options => {
    calls.push(['switchTab', options])
  }
  Taro.reLaunch = async options => {
    calls.push(['reLaunch', options])
  }
  Taro.setStorageSync = (key, value) => storage.set(key, value)
  Taro.removeStorageSync = key => storage.delete(key)
  Taro.navigateTo = async options => { calls.push(['navigateTo', options]) }
  Taro.showToast = async options => { calls.push(['showToast', options]) }

  return { calls, storage }
}

const marketingPages = [
  '/pages/index/index', '/pages/training/index', '/pages/registration/index', '/pages/profile/index',
  '/pages/registration/category?vendor=H3C', '/pages/registration/category?vendor=NISP',
  '/pages/nisp/index?level=1', '/pages/nisp/index?level=2',
  '/pages/registration/category?vendor=%E4%BA%BA%E7%A4%BE',
  '/pages/mine/points', '/pages/mine/points-history',
  '/pages/mine/registrations', '/pages/orders/index', '/pages/mine/contact-teachers',
  '/pages/mine/feedback', '/pages/mine/agreements', '/pages/mine/about',
  '/pages/ai-consult/index', '/pages/quiz/index',
  '/pages/activity-zone/detail?id=7', '/pages/employment-zone/detail?id=9',
]
for (const url of marketingPages) {
  test(`marketing target dispatches to the correct navigation API: ${url}`, async () => {
    const mock = installNavigationMock([])
    await navigateToUrl(url)
    const isTab = ['/pages/index/index', '/pages/training/index', '/pages/profile/index'].includes(url)
    assert.deepEqual(mock.calls, [[isTab ? 'switchTab' : 'navigateTo', { url }]])
  })
}

for (const tab of ['activity', 'competition', 'employment']) {
  test(`marketing Tab preserves ${tab} in the existing storage contract before switching`, async () => {
    const mock = installNavigationMock([])
    Taro.switchTab = async options => {
      assert.equal(mock.storage.get('activityZoneTab'), tab)
      mock.calls.push(['switchTab', options])
    }
    await navigateToUrl(`/pages/activity-zone/index?tab=${tab}`)
    if (tab === 'activity' && !FEATURES.activityTab) {
      assert.deepEqual(mock.calls, [['showToast', { title: '当前版本暂未开放活动', icon: 'none' }]])
      assert.equal(mock.storage.has('activityZoneTab'), false)
      return
    }
    assert.deepEqual(mock.calls, [['switchTab', { url: '/pages/activity-zone/index' }]])
  })
}

test('marketing navigation clears stale Tab state and handles invalid or failed targets', async () => {
  const mock = installNavigationMock([])
  mock.storage.set('activityZoneTab', 'employment')
  await navigateToUrl('/pages/activity-zone/index')
  assert.equal(mock.storage.has('activityZoneTab'), false)
  await navigateToUrl('/pages/activity-zone/index?tab=other')
  assert.equal(mock.calls.at(-1)[1].title, '目标标签不可用，请联系管理员')
  Taro.switchTab = async () => { throw new Error('switch failed') }
  await navigateToUrl('/pages/activity-zone/index?tab=competition')
  assert.equal(mock.storage.has('activityZoneTab'), false)
  assert.equal(mock.calls.at(-1)[1].title, '页面打开失败，请重试')
  Taro.navigateTo = async () => { throw new Error('page missing') }
  await navigateToUrl('/pages/unknown/index')
  assert.equal(mock.calls.at(-1)[1].title, '页面打开失败，请重试')
})

for (const url of ['/pages/course/index', '/pages/course/detail?id=7', '/pages/mine/courses', 'javascript:alert(1)', 'https://example.com', 'http://ztyyx.cn']) {
  test(`invalid marketing target only shows a Chinese error: ${url}`, async () => {
    const mock = installNavigationMock([])
    await navigateToUrl(url)
    assert.equal(mock.calls.length, 1)
    assert.equal(mock.calls[0][0], 'showToast')
    assert.equal(mock.calls[0][1].icon, 'none')
  })
}

test('allowed external links use WebView and preserve encoded query values', async () => {
  const mock = installNavigationMock([])
  const url = 'https://mp.weixin.qq.com/s?x=%26&y=%2F'
  await navigateToUrl(url)
  assert.deepEqual(mock.calls, [['navigateTo', { url: `/pages/webview/index?url=${encodeURIComponent(url)}` }]])
})

test('safeNavigateBack preserves normal page-stack navigation', async () => {
  const mock = installNavigationMock([{ route: 'a' }, { route: 'b' }])

  assert.equal(
    await safeNavigateBack({ fallbackUrl: '/pages/orders/index' }),
    'back',
  )
  assert.deepEqual(mock.calls, [['navigateBack', undefined]])
})

test('safeNavigateBack uses switchTab for a first-page tab fallback', async () => {
  const mock = installNavigationMock([{ route: 'a' }])

  assert.equal(await safeNavigateBack(), 'fallback')
  assert.deepEqual(mock.calls, [
    ['switchTab', { url: '/pages/index/index' }],
  ])
})

test('safeNavigateBack uses reLaunch for a first-page non-tab fallback', async () => {
  const mock = installNavigationMock([{ route: 'a' }])

  await safeNavigateBack({
    fallbackUrl: '/pages/orders/index?status=pending',
  })
  assert.deepEqual(mock.calls, [
    ['reLaunch', { url: '/pages/orders/index?status=pending' }],
  ])
})

test('safeNavigateBack recovers when navigateBack races a shrinking page stack', async () => {
  const mock = installNavigationMock([{ route: 'a' }, { route: 'b' }], true)

  await safeNavigateBack({ fallbackUrl: '/pages/training/index' })
  assert.deepEqual(mock.calls, [
    ['navigateBack', undefined],
    ['switchTab', { url: '/pages/training/index' }],
  ])
})

test('activity-zone back passes the sub-tab only when fallback is needed', async () => {
  const directEntry = installNavigationMock([{ route: 'a' }])
  await goBackToActivityZone('competition')
  assert.equal(directEntry.storage.get('activityZoneTab'), 'competition')
  assert.deepEqual(directEntry.calls, [
    ['switchTab', { url: '/pages/activity-zone/index' }],
  ])

  const normalEntry = installNavigationMock([{ route: 'a' }, { route: 'b' }])
  await goBackToActivityZone('employment')
  assert.equal(normalEntry.storage.has('activityZoneTab'), false)
  assert.deepEqual(normalEntry.calls, [['navigateBack', undefined]])
})

test('business pages do not call Taro.navigateBack directly', async () => {
  const root = resolve(process.cwd(), 'src')
  const files = (await readdir(root, {
    encoding: 'utf8',
    recursive: true,
  })).filter(file => (
    (file.startsWith('pages/') || file.startsWith('components/'))
    && (file.endsWith('.ts') || file.endsWith('.tsx'))
  ))

  const offenders = []
  for (const file of files) {
    if (file === 'utils/navigation.ts') continue
    const source = await readFile(resolve(root, file), 'utf8')
    if (source.includes('Taro.navigateBack(')) offenders.push(file)
  }

  assert.deepEqual(offenders, [])
})

test('direct-entry pages keep business-specific fallbacks', async () => {
  const readSource = path => readFile(resolve(process.cwd(), path), 'utf8')
  const expectations = [
    ['src/pages/activity-zone/detail.tsx', "goBackToActivityZone('activity')"],
    ['src/pages/competition/detail.tsx', "goBackToActivityZone('competition')"],
    ['src/pages/employment-zone/detail.tsx', "goBackToActivityZone('employment')"],
    ['src/pages/order-detail/index.tsx', "fallbackUrl: '/pages/orders/index'"],
    ['src/pages/registration/xuexin-guide.tsx', "fallbackUrl: '/pages/registration/category'"],
    ['src/pages/quiz/practice.tsx', "fallbackUrl: '/pages/training/index'"],
    ['src/pages/quiz/mock.tsx', "fallbackUrl: '/pages/training/index'"],
  ]

  for (const [path, expected] of expectations) {
    const source = await readSource(path)
    assert.match(source, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})
