import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const FEEDBACK_PAGE_FILE = new URL('../src/pages/mine/feedback.tsx', import.meta.url)
const PROFILE_PAGE_FILE = new URL('../src/pages/mine/profile.tsx', import.meta.url)
const SERVICE_PAGE_FILE = new URL('../src/pages/service/index.tsx', import.meta.url)
const ROUTES_FILE = new URL('../src/constants/routes.ts', import.meta.url)
const APP_CONFIG_FILE = new URL('../src/app.config.ts', import.meta.url)

test('feedback page reuses the ticket API with the agreed content protocol', async () => {
  const source = await readFile(FEEDBACK_PAGE_FILE, 'utf8')

  assert.match(source, /createTicket\(\{ content: lines\.join\('\\n'\) \}\)/)
  assert.match(source, /【意见反馈】/)
  assert.match(source, /类型：\$\{feedbackType\}/)
  assert.match(source, /说明：\$\{text\}/)
  assert.match(source, /图片：\$\{uploadedUrls\.join\(','\)\}/)
  assert.match(source, /MIN_DESCRIPTION_LENGTH \|\| text\.length > MAX_DESCRIPTION_LENGTH/)
  assert.match(source, /const MAX_DESCRIPTION_LENGTH = 500/)
})

test('feedback page limits images to three compressed uploads of five megabytes', async () => {
  const source = await readFile(FEEDBACK_PAGE_FILE, 'utf8')

  assert.match(source, /const MAX_IMAGES = 3/)
  assert.match(source, /const MAX_IMAGE_SIZE_BYTES = 5 \* 1024 \* 1024/)
  assert.match(source, /mediaType: \['image'\]/)
  assert.match(source, /sizeType: \['compressed'\]/)
  assert.match(source, /uploadFile\(localPath\)/)
  assert.match(source, /item\.status === 'uploading'/)
  assert.match(source, /item\.status === 'failed'/)
})

test('feedback page is registered and reachable from settings and service center', async () => {
  const [profileSource, serviceSource, routesSource, appConfigSource] = await Promise.all([
    readFile(PROFILE_PAGE_FILE, 'utf8'),
    readFile(SERVICE_PAGE_FILE, 'utf8'),
    readFile(ROUTES_FILE, 'utf8'),
    readFile(APP_CONFIG_FILE, 'utf8'),
  ])

  assert.match(routesSource, /MINE_FEEDBACK: 'pages\/mine\/feedback'/)
  assert.match(appConfigSource, /root: 'pages\/mine'/)
  assert.match(appConfigSource, /'feedback'/)
  assert.match(profileSource, /SETTINGS_FEEDBACK, route: ROUTES\.MINE_FEEDBACK/)
  assert.match(serviceSource, /ROUTES\.MINE_FEEDBACK/)
  assert.match(serviceSource, /useDidShow/)
})
