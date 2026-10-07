import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import test from 'node:test'
import Taro from '@tarojs/taro'
import {
  goBackToActivityZone,
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

  return { calls, storage }
}

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
