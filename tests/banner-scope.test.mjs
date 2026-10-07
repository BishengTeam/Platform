import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'

test('marketing banner rendering is limited to the home page', async () => {
  const root = new URL('../src/', import.meta.url)
  const files = (await readdir(root, { recursive: true, encoding: 'utf8' }))
    .filter(file => file.endsWith('.tsx'))
  const bannerPages = []

  for (const file of files) {
    const source = await readFile(new URL(file, root), 'utf8')
    if (source.includes('<ZoneBanner')) bannerPages.push(file)
  }

  assert.deepEqual(bannerPages, ['pages/index/index.tsx'])
})

test('legacy competition banner mock data is removed', async () => {
  const source = await readFile(
    new URL('../src/constants/mock/competition.ts', import.meta.url),
    'utf8',
  )

  assert.equal(source.includes('competitionBannerItems'), false)
  assert.equal(source.includes('CompetitionBannerItem'), false)
})
