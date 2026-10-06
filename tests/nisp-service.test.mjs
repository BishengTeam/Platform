import assert from 'node:assert/strict'
import test from 'node:test'
import Taro from '@tarojs/taro'
import {
  clearAuthTokens,
  resetRequestStateForTest,
  setAuthTokens,
} from '../src/utils/request.ts'
import { nispService } from '../src/services/nispService.ts'

function installStorage() {
  const storage = new Map()
  Taro.getStorageSync = key => storage.get(key) ?? ''
  Taro.setStorageSync = (key, value) => storage.set(key, value)
  Taro.removeStorageSync = key => storage.delete(key)
  Taro.getStorageInfoSync = () => ({ keys: [...storage.keys()] })
  return storage
}

function envelope(data) {
  return { statusCode: 200, data: { code: 0, data, message: 'ok' }, header: {}, cookies: [], errMsg: 'ok' }
}

test('NISP material upload and resubmission use the backend contract', async () => {
  resetRequestStateForTest()
  installStorage()
  const calls = []
  let upload = null
  Taro.showLoading = () => undefined
  Taro.hideLoading = () => undefined
  Taro.showToast = () => undefined

  Taro.uploadFile = async options => {
    upload = options
    return {
      data: JSON.stringify({
        code: 0,
        data: {
          material_type: 'xuexin_report',
          storage_key: 'nisp/materials/7/xuexin.pdf',
          size_bytes: 2048,
          sha256: 'b'.repeat(64),
        },
        message: 'ok',
      }),
    }
  }
  Taro.request = async options => {
    calls.push(options)
    return envelope({ id: 7, status: 'pending_review' })
  }
  setAuthTokens('access-token', 'refresh-token')

  const uploaded = await nispService.uploadMaterial('/tmp/xuexin.pdf', 'xuexin_report')
  const resubmitted = await nispService.resubmitMaterials(7, {
    xuexin_report_key: uploaded.storage_key,
  })

  assert.equal(uploaded.material_type, 'xuexin_report')
  assert.equal(upload.url.endsWith('/api/nisp/materials/upload'), true)
  assert.equal(upload.timeout, 60000)
  assert.equal(upload.formData.material_type, 'xuexin_report')
  assert.equal(upload.header.Authorization, 'Bearer access-token')
  assert.equal(resubmitted.status, 'pending_review')
  assert.equal(calls[0].url.endsWith('/api/nisp/registrations/7/materials'), true)
  assert.deepEqual(calls[0].data, { xuexin_report_key: uploaded.storage_key })
  assert.equal(calls[0].header.Authorization, 'Bearer access-token')
  clearAuthTokens()
})

test('NISP material upload reports transport and envelope failures clearly', async () => {
  installStorage()
  setAuthTokens('access-token', 'refresh-token')

  Taro.uploadFile = async () => ({
    statusCode: 413,
    data: '',
    errMsg: 'ok',
  })
  await assert.rejects(
    () => nispService.uploadMaterial('/tmp/report.pdf', 'xuexin_report'),
    /材料上传失败\(413\)/,
  )

  Taro.uploadFile = async () => ({
    statusCode: 200,
    data: '<html>bad gateway</html>',
    errMsg: 'ok',
  })
  await assert.rejects(
    () => nispService.uploadMaterial('/tmp/report.pdf', 'xuexin_report'),
    /材料上传响应格式错误/,
  )

  Taro.uploadFile = async () => ({
    statusCode: 200,
    data: JSON.stringify({ code: 40001, message: '仅支持PDF', data: null }),
    errMsg: 'ok',
  })
  await assert.rejects(
    () => nispService.uploadMaterial('/tmp/report.docx', 'xuexin_report'),
    /仅支持PDF/,
  )
  clearAuthTokens()
})
