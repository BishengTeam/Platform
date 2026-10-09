import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const file = p => new URL(`../src/${p}`, import.meta.url)

test('internal scroll lists use a real ScrollView refresher instead of dead page hooks', async () => {
  const component = await readFile(file('components/RefreshableScrollView/index.tsx'), 'utf8')
  const pages = [
    'pages/index/index.tsx',
    'pages/activity-zone/index.tsx',
    'pages/training/index.tsx',
    'pages/quiz/index.tsx',
    'pages/service/index.tsx',
    'pages/orders/index.tsx',
    'pages/registration/index.tsx',
    'pages/nisp/index.tsx',
    'pages/mine/points.tsx',
    'pages/mine/points-history.tsx',
    'pages/mine/registrations.tsx',
    'pages/mine/collections.tsx',
    'pages/mine/video-codes.tsx',
  ]

  assert.match(component, /refresherEnabled/)
  assert.match(component, /refresherTriggered=\{refreshing\}/)
  assert.match(component, /onRefresherRefresh=\{handleRefresh\}/)

  for (const page of pages) {
    const source = await readFile(file(page), 'utf8')
    assert.match(source, /<RefreshableScrollView[\s\S]*onRefresh=/, `${page} should be refreshable`)
  }
})

test('natural-scroll pages enable native pull refresh and wait for data loading', async () => {
  const h3cConfig = await readFile(file('pages/h3c/index.config.ts'), 'utf8')
  const h3cPage = await readFile(file('pages/h3c/index.tsx'), 'utf8')
  const orderConfig = await readFile(file('pages/order-detail/index.config.ts'), 'utf8')
  const orderPage = await readFile(file('pages/order-detail/index.tsx'), 'utf8')

  assert.match(h3cConfig, /enablePullDownRefresh:\s*true/)
  assert.match(h3cPage, /usePullDownRefresh\(async \(\) => \{[\s\S]*?await load\(\)/)
  assert.match(orderConfig, /enablePullDownRefresh:\s*true/)
  assert.match(orderPage, /usePullDownRefresh\(async \(\) => \{[\s\S]*?await loadOrder/)
})

test('orders silently refresh whenever users return from payment or order detail', async () => {
  const source = await readFile(file('pages/orders/index.tsx'), 'utf8')

  assert.match(source, /useDidShow\(\(\) => \{ void loadOrders\(\) \}\)/)
  assert.match(source, /const silent = hasLoadedRef\.current/)
  assert.match(source, /if \(!silent\) setLoading\(true\)/)
  assert.match(source, /<RefreshableScrollView className=\{styles\.body\} onRefresh=\{loadOrders\}>/)
})
