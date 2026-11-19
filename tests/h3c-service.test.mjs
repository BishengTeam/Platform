import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import Taro from '@tarojs/taro'
import { clearAuthTokens, resetRequestStateForTest, setAuthTokens } from '../src/utils/request.ts'
import { h3cService } from '../src/services/h3cService.ts'

function envelope(data) {
  return { statusCode: 200, data: { code: 0, data, message: 'ok' }, header: {}, cookies: [], errMsg: 'ok' }
}

function installStorage() {
  const storage = new Map()
  Taro.getStorageSync = key => storage.get(key) ?? ''
  Taro.setStorageSync = (key, value) => storage.set(key, value)
  Taro.removeStorageSync = key => storage.delete(key)
  Taro.getStorageInfoSync = () => ({ keys: [...storage.keys()] })
  return storage
}

test('H3C service uses the frozen user registration routes', async () => {
  resetRequestStateForTest()
  installStorage()
  const calls = []
  Taro.showLoading = () => undefined
  Taro.hideLoading = () => undefined
  Taro.showToast = () => undefined
  Taro.request = async options => {
    calls.push(options)
    if (options.url.endsWith('/api/h3c/exam-batches')) {
      return envelope([{ id: 3, prices: [] }])
    }
    if (options.url.endsWith('/api/h3c/registrations/12/materials')) {
      return envelope({ id: 12, status: 'pending_review' })
    }
    return envelope({ id: 12 })
  }
  setAuthTokens('access-token', 'refresh-token')

  const batches = await h3cService.listBatches()
  const resubmitted = await h3cService.resubmitMaterials(12, {
    coupon_proof_key: 'h3c/materials/7/coupon.jpg',
    student_proof_key: null,
  })

  assert.deepEqual(batches, [{ id: 3, prices: [] }])
  assert.equal(resubmitted.status, 'pending_review')
  assert.equal(calls[0].header.Authorization, 'Bearer access-token')
  assert.equal(calls[1].header.Authorization, 'Bearer access-token')
  assert.equal(calls[1].url.includes('/api/h3c/registrations/12/materials'), true)
  assert.equal(calls[1].data.coupon_proof_key, 'h3c/materials/7/coupon.jpg')
  clearAuthTokens()
})

test('H3C material upload sends multipart fields and bearer token', async () => {
  resetRequestStateForTest()
  installStorage()
  let upload = null
  Taro.uploadFile = async options => {
    upload = options
    return {
      data: JSON.stringify({
        code: 0,
        data: {
          material_type: 'coupon_proof',
          storage_key: 'h3c/materials/7/upload.jpg',
          size_bytes: 128,
          sha256: 'a'.repeat(64),
        },
        message: 'ok',
      }),
    }
  }
  setAuthTokens('access-token', 'refresh-token')
  const result = await h3cService.uploadMaterial('/tmp/coupon.jpg', 3, 'coupon_proof')

  assert.equal(result.storage_key, 'h3c/materials/7/upload.jpg')
  assert.equal(upload.url.endsWith('/api/h3c/materials'), true)
  assert.equal(upload.name, 'file')
  assert.equal(upload.filePath, '/tmp/coupon.jpg')
  assert.equal(upload.formData.batch_id, '3')
  assert.equal(upload.formData.material_type, 'coupon_proof')
  assert.equal(upload.header.Authorization, 'Bearer access-token')
  clearAuthTokens()
})

test('H3C pages and independent entry are registered', async () => {
  const appConfig = await readFile('src/app.config.ts', 'utf8')
  const routes = await readFile('src/constants/routes.ts', 'utf8')
  assert.match(appConfig, /root: 'pages\/h3c'/)
  assert.match(appConfig, /pages: \['index', 'form', 'exam-booking\/index'\]/)
  assert.match(routes, /H3C_INDEX: 'pages\/h3c\/index'/)
  assert.match(routes, /H3C_FORM: 'pages\/h3c\/form'/)
  assert.match(routes, /H3C_EXAM_BOOKING: 'pages\/h3c\/exam-booking\/index'/)
  assert.equal(routes.includes('H3C_RECORDS'), false)
  assert.match(routes, /MINE_REGISTRATIONS: 'pages\/mine\/registrations'/)
  assert.match(appConfig, /'registrations'/)
})

test('H3C booking service calls the frozen exam booking endpoints', async () => {
  resetRequestStateForTest()
  installStorage()
  const calls = []
  Taro.showLoading = () => undefined
  Taro.hideLoading = () => undefined
  Taro.showToast = () => undefined
  Taro.request = async options => {
    calls.push(options)
    if (options.url.includes('/dates')) return envelope({ dates: ['2026-11-20'] })
    if (options.url.includes('/slots')) return envelope({ slots: [] })
    if (options.url.includes('/bookings')) return envelope([])
    if (options.url.includes('/book')) return envelope({ booking_id: 8, exam_date: '2026-11-20' })
    return envelope([{ id: 4, name: '考场计划', open_date_start: '2026-11-01', open_date_end: '2026-12-31' }])
  }
  setAuthTokens('access-token', 'refresh-token')

  const schedules = await h3cService.listExamSchedules(12)
  const dates = await h3cService.listExamDates(schedules[0].id)
  const slots = await h3cService.listExamSlots(schedules[0].id, dates[0], 12)
  const booking = await h3cService.bookExamSeat(schedules[0].id, 12, 9, dates[0])
  const bookings = await h3cService.listExamBookings()

  assert.equal(schedules.length, 1)
  assert.deepEqual(dates, ['2026-11-20'])
  assert.deepEqual(slots, [])
  assert.equal(booking.booking_id, 8)
  assert.deepEqual(bookings, [])
  assert.equal(calls[0].data.registration_id, 12)
  assert.equal(calls[0].data.vendor, 'h3c')
  assert.equal(calls[2].data.registration_id, 12)
  assert.equal(calls[2].data.date, '2026-11-20')
  assert.equal(calls[3].url.includes('/book?vendor=h3c&registration_id=12'), true)
  assert.deepEqual(calls[3].data, { slot_id: 9, exam_date: '2026-11-20' })
  clearAuthTokens()
})
