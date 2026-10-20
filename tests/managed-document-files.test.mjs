import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import Taro from '@tarojs/taro'
import { getSceneDocumentFile, H3C_STUDENT_XUEXIN_GUIDE_SCENE, NISP_EDUCATION_REPORT_GUIDE_SCENE, NISP_LEVEL2_APPLICATION_FORM_SCENE } from '../src/services/documentService.ts'
import { previewDocumentFile, sendDocumentFile } from '../src/utils/documentFile.ts'
import { resetRequestStateForTest } from '../src/utils/request.ts'

let calls
let binding
let version
let metadataStatus
beforeEach(() => {
  resetRequestStateForTest()
  calls = { requests: [], downloads: [], previews: [], shares: [] }
  binding = 'client.current_document'
  version = 1
  metadataStatus = 200
  Taro.getStorageSync = key => key === 'auth_token' ? 'private-token' : ''
  Taro.removeStorageSync = () => undefined
  Taro.getStorageInfoSync = () => ({ keys: [] })
  Taro.showModal = () => Promise.resolve({})
  Taro.showToast = () => undefined
  Taro.showLoading = () => undefined
  Taro.hideLoading = () => undefined
  Taro.request = async options => {
    calls.requests.push(options)
    if (metadataStatus !== 200) return { statusCode: metadataStatus, data: { code: metadataStatus === 401 ? 40100 : 40400, message: 'missing' } }
    return { statusCode: 200, data: { code: 0, data: options.url.includes('/scenes/')
      ? { document: binding ? { document_key: binding } : null }
      : { original_filename: `甲方文件-v${version}.pdf`, download_url: `https://private.example/document-${version}.pdf?signature=fresh-${version}` } } }
  }
  Taro.downloadFile = async options => { calls.downloads.push(options); return { statusCode: 200, tempFilePath: `wxfile://document-${version}` } }
  Taro.getFileSystemManager = () => ({ readFile: options => options.success({ data: new TextEncoder().encode('%PDF-1.4\nfixture').buffer }) })
  Taro.canIUse = () => true
  Taro.openDocument = async options => { calls.previews.push(options) }
  Taro.shareFileMessage = async options => { calls.shares.push(options) }
})

for (const scene of [H3C_STUDENT_XUEXIN_GUIDE_SCENE, NISP_EDUCATION_REPORT_GUIDE_SCENE, NISP_LEVEL2_APPLICATION_FORM_SCENE]) {
  test(`${scene}: preview and forwarding use current scene resource and original filename`, async () => {
    const file = await getSceneDocumentFile(scene)
    assert.match(calls.requests[0].url, new RegExp(`/api/documents/scenes/${scene}$`))
    assert.match(calls.requests[1].url, /\/api\/documents\/client.current_document$/)
    assert.equal(calls.requests[0].header.Authorization, 'Bearer private-token')
    assert.equal(calls.requests[1].header.Authorization, 'Bearer private-token')
    // Signed resource URLs are fetched without leaking the API bearer token to storage.
    assert.equal(calls.downloads[0].header, undefined)
    assert.equal(calls.previews.length, 0)
    assert.equal(calls.shares.length, 0)
    await previewDocumentFile(file)
    await sendDocumentFile(file)
    assert.deepEqual(calls.previews[0], { filePath: 'wxfile://document-1', fileType: 'pdf', showMenu: true })
    assert.deepEqual(calls.shares[0], { filePath: 'wxfile://document-1', fileName: '甲方文件-v1.pdf' })
  })
}

test('replacement or rebinding refreshes both metadata and signed URL for the next action', async () => {
  await getSceneDocumentFile(NISP_LEVEL2_APPLICATION_FORM_SCENE)
  binding = 'client.replacement'
  version = 2
  const next = await getSceneDocumentFile(NISP_LEVEL2_APPLICATION_FORM_SCENE)
  assert.equal(calls.requests.length, 4)
  assert.match(calls.requests[3].url, /\/client.replacement$/)
  assert.equal(calls.downloads.length, 2)
  assert.match(calls.downloads[1].url, /signature=fresh-2$/)
  assert.equal(next.filename, '甲方文件-v2.pdf')
})

test('unconfigured, missing, and expired-login resources stop before downloading with specific feedback', async () => {
  binding = null
  await assert.rejects(getSceneDocumentFile(NISP_LEVEL2_APPLICATION_FORM_SCENE), /文档暂未配置/)
  metadataStatus = 404
  await assert.rejects(getSceneDocumentFile(NISP_LEVEL2_APPLICATION_FORM_SCENE), /暂无可用文档/)
  metadataStatus = 401
  await assert.rejects(getSceneDocumentFile(NISP_LEVEL2_APPLICATION_FORM_SCENE), /登录已失效/)
  assert.equal(calls.downloads.length, 0)
})

test('a failed signed download can retry with a fresh link without losing the resource identity', async () => {
  Taro.downloadFile = async options => { calls.downloads.push(options); return { statusCode: 403, tempFilePath: '' } }
  await assert.rejects(getSceneDocumentFile(H3C_STUDENT_XUEXIN_GUIDE_SCENE), /文件获取失败/)
  version = 2
  Taro.downloadFile = async options => { calls.downloads.push(options); return { statusCode: 200, tempFilePath: 'wxfile://fresh' } }
  assert.equal((await getSceneDocumentFile(H3C_STUDENT_XUEXIN_GUIDE_SCENE)).filePath, 'wxfile://fresh')
  assert.match(calls.downloads[1].url, /fresh-2$/)
})
