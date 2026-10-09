import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = path => readFile(path, 'utf8')

test('mini program replaces old course playback with managed video codes', async () => {
  const appConfig = await read('src/app.config.ts')
  const profile = await read('src/constants/mock/profile.ts')
  const service = await read('src/services/videoWebService.ts')
  const page = await read('src/pages/mine/video-codes.tsx')

  assert.match(appConfig, /root: 'pages\/mine'/)
  assert.match(appConfig, /'video-codes'/)
  assert.doesNotMatch(appConfig, /root: 'pages\/course'/)
  assert.doesNotMatch(appConfig, /'courses'/)
  assert.match(profile, /label: STRINGS\.MINE_VIDEO_CODES_TITLE/)
  assert.match(profile, /route: 'pages\/mine\/video-codes'/)
  assert.match(service, /\/api\/videoweb\/codes/)
  assert.match(page, /Taro\.setClipboardData/)
  assert.match(page, /RefreshableScrollView/)
})

test('course playback pages are removed and no runtime route remains', async () => {
  const routes = await read('src/constants/routes.ts')
  const activityDetail = await read('src/pages/activity-zone/detail.tsx')

  assert.doesNotMatch(routes, /COURSE_(INDEX|DETAIL|CONTENT)/)
  assert.doesNotMatch(routes, /MINE_COURSES:/)
  assert.doesNotMatch(activityDetail, /related_course_id &&/)
  assert.doesNotMatch(activityDetail, /pages\/course/)
})
