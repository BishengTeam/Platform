import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { STRINGS } from '../src/constants/strings.ts'

const file = (p) => new URL(`../src/${p}`, import.meta.url)

test('activity zone defaults to competition and shows preparing empty states', async () => {
  const source = await readFile(file('pages/activity-zone/index.tsx'), 'utf8')
  assert.match(source, /useState<MainTab>\('competition'\)/)
  assert.match(source, /showActivityEmpty = activitiesLoaded && allActivities\.length === 0/)
  assert.match(source, /showEmploymentEmpty = jobsLoaded && allJobs\.length === 0/)
  // 活动空态时不得再渲染“全部/进行中/即将开始/已结束”筛选标签
  assert.match(source, /showTagFilter = mainTab === 'competition' \|\| \(mainTab === 'activity' && !showActivityEmpty\)/)
  assert.match(source, /title=\{STRINGS\.ACTIVITY_EMPTY_TITLE\}/)
  assert.match(source, /title=\{STRINGS\.EMPLOYMENT_EMPTY_TITLE\}/)
})

test('home activity and employment surfaces follow backend content visibility', async () => {
  const source = await readFile(file('pages/index/index.tsx'), 'utf8')
  // 金刚区：后台上架活动/岗位后入口自动出现，下架自动隐藏，无需改代码发版。
  assert.match(source, /if \(activities\.length > 0\)[\s\S]*?tab: 'activity'/)
  assert.match(source, /if \(employmentJobs\.length > 0\)[\s\S]*?tab: 'employment'/)
  // 首页瀑布流：同样按内容有无整块显示/隐藏。
  assert.match(source, /activities\.length > 0 && \(/)
  assert.match(source, /employmentJobs\.length > 0 && \(/)
  // 不再允许“敬请期待”占位入口回潮。
  const activeSource = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')
  assert.doesNotMatch(activeSource, /comingSoon: true/)
})

test('home king-kong grid keeps the study zone entry visible', async () => {
  const source = await readFile(file('pages/index/index.tsx'), 'utf8')
  assert.match(source, /name: STRINGS\.INDEX_ZONE_STUDY,[\s\S]*?url: '\/pages\/training\/index'/)
  // 2026-10-01 甲方要求：学习专区入口不再隐藏，金刚区保持 2x2 填满。
  assert.doesNotMatch(source, /学习专区暂时隐藏/)
})

test('ai consult no longer advertises unavailable activities or jobs', async () => {
  const source = await readFile(file('pages/ai-consult/index.tsx'), 'utf8')
  const activityBlock = source.match(/activity: \(id\) => \(\{[\s\S]*?\}\),/)?.[0] ?? ''
  const employmentBlock = source.match(/employment: \(id\) => \(\{[\s\S]*?\}\),/)?.[0] ?? ''
  assert.ok(activityBlock, 'activity intent builder should exist')
  assert.ok(employmentBlock, 'employment intent builder should exist')
  assert.doesNotMatch(activityBlock, /card:/)
  assert.doesNotMatch(employmentBlock, /card:/)
  assert.ok(STRINGS.INDEX_AI_ACTIVITY.includes('筹备中'))
  assert.ok(STRINGS.INDEX_AI_EMPLOYMENT.includes('筹备中'))
  assert.equal(STRINGS.AI_COMPETITION_CARD_DESC, '最新赛事报名与赛道信息')
})

test('login poster replaces the fake training camp with practice assistant', async () => {
  const source = await readFile(file('pages/login-poster/index.tsx'), 'utf8')
  assert.match(source, /type: 'quiz'/)
  assert.equal(STRINGS.LOGIN_POSTER_CARD_3_TITLE, '练习助手')
  assert.ok(!STRINGS.LOGIN_POSTER_CARD_3_TITLE.includes('题库'))
  assert.ok(!STRINGS.LOGIN_POSTER_CARD_3_DESC.includes('题库'))
  assert.ok(!STRINGS.LOGIN_POSTER_CARD_3_DESC.includes('报名开启'))
})
