import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import Taro from '@tarojs/taro'
import { canSendCommitmentTemplate, rensheService, TEMPLATE_SHARE_UNSUPPORTED } from '../src/services/rensheService.ts'

let calls
let response
let content
beforeEach(() => {
  calls = { download: [], preview: [], share: [] }
  response = { statusCode: 200, tempFilePath: 'wxfile://tmp/template' }
  content = new TextEncoder().encode('%PDF-1.4\nfixture').buffer
  Taro.getStorageSync = () => 'test-access-token'
  Taro.downloadFile = async options => { calls.download.push(options); return response }
  Taro.getFileSystemManager = () => ({ readFile: options => options.success({ data: content }) })
  Taro.openDocument = async options => { calls.preview.push(options) }
  Taro.canIUse = name => name === 'shareFileMessage'
  Taro.shareFileMessage = async options => { calls.share.push(options) }
})

test('fetching a template stays authenticated, separate from opening, and does not reuse old files', async () => {
  const file = await rensheService.getCommitmentTemplateFile(42, '本人承诺书.PDF')
  assert.deepEqual(file, { filePath: response.tempFilePath, filename: '本人承诺书.PDF', fileType: 'pdf' })
  assert.equal(calls.preview.length, 0)
  assert.equal(calls.share.length, 0)
  assert.match(calls.download[0].url, /\/api\/renshe\/batches\/42\/commitment-template$/)
  assert.doesNotMatch(calls.download[0].url, /test-access-token/)
  assert.deepEqual(calls.download[0].header, { Authorization: 'Bearer test-access-token' })
  response.tempFilePath = 'wxfile://tmp/new-template'
  assert.equal((await rensheService.getCommitmentTemplateFile(42, '新版.pdf')).filePath, response.tempFilePath)
  assert.equal(calls.download.length, 2)
})

test('DOCX keeps its original suffix and forwards the actual local file with a custom filename', async () => {
  content = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1]).buffer
  const file = await rensheService.getCommitmentTemplateFile(42, '甲方模板.docx')
  await rensheService.previewCommitmentTemplate(file)
  await rensheService.sendCommitmentTemplate(file)
  assert.deepEqual(calls.preview, [{ filePath: response.tempFilePath, fileType: 'docx', showMenu: true }])
  assert.deepEqual(calls.share, [{ filePath: response.tempFilePath, fileName: '甲方模板.docx' }])
})

test('a missing filename falls back to the actual format and mismatched extensions are rejected', async () => {
  assert.equal((await rensheService.getCommitmentTemplateFile(42)).filename, '承诺书模板.pdf')
  await assert.rejects(rensheService.getCommitmentTemplateFile(42, '错误.docx'), /模板获取失败/)
  content = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1]).buffer
  assert.equal((await rensheService.getCommitmentTemplateFile(42)).filename, '承诺书模板.docx')
})

test('expired login, missing template, server failures, and missing local files have distinct feedback', async () => {
  for (const [statusCode, message] of [[401, /登录已失效/], [404, /暂无可用承诺书模板/], [403, /模板获取失败/], [500, /模板获取失败/]]) {
    response.statusCode = statusCode
    await assert.rejects(rensheService.getCommitmentTemplateFile(42, '模板.pdf'), message)
  }
  response = { statusCode: 200, tempFilePath: '' }
  await assert.rejects(rensheService.getCommitmentTemplateFile(42, '模板.pdf'), /模板获取失败/)
  Taro.getStorageSync = () => ''
  const before = calls.download.length
  await assert.rejects(rensheService.getCommitmentTemplateFile(42), /登录已失效/)
  assert.equal(calls.download.length, before)
})

test('network or local read failures and HTTP-200 error documents cannot open the previewer', async () => {
  for (const text of ['', '{"code":401}', '<html>server error</html>']) {
    content = new TextEncoder().encode(text).buffer
    await assert.rejects(rensheService.getCommitmentTemplateFile(42, '模板.pdf'), /模板获取失败/)
  }
  Taro.getFileSystemManager = () => ({ readFile: options => options.fail({ errMsg: 'file not found' }) })
  await assert.rejects(rensheService.getCommitmentTemplateFile(42, '模板.pdf'), /模板获取失败/)
  Taro.downloadFile = async () => { throw { errMsg: 'downloadFile:fail timeout' } }
  await assert.rejects(rensheService.getCommitmentTemplateFile(42, '模板.pdf'), /模板获取失败/)
  assert.equal(calls.preview.length, 0)
})

test('capability is checked without OS guesses and unavailable sharing leaves preview usable', async () => {
  const file = await rensheService.getCommitmentTemplateFile(42, '模板.pdf')
  Taro.canIUse = () => false
  assert.equal(canSendCommitmentTemplate(), false)
  await assert.rejects(rensheService.sendCommitmentTemplate(file), { message: TEMPLATE_SHARE_UNSUPPORTED })
  await rensheService.previewCommitmentTemplate(file)
  assert.equal(calls.preview.length, 1)
  assert.equal(calls.share.length, 0)
  Taro.canIUse = () => { throw new Error('unavailable runtime') }
  assert.equal(canSendCommitmentTemplate(), false)
  Taro.canIUse = () => true
  Taro.shareFileMessage = undefined
  assert.equal(canSendCommitmentTemplate(), false)
})

test('a preview failure does not prevent sending and is never described as a download error', async () => {
  const file = await rensheService.getCommitmentTemplateFile(42, '模板.pdf')
  Taro.openDocument = async () => { throw { errMsg: 'openDocument:fail not supported' } }
  await assert.rejects(rensheService.previewCommitmentTemplate(file), /无法预览此文件/)
  await rensheService.sendCommitmentTemplate(file)
  assert.equal(calls.share.length, 1)
})

test('chat selection cancellation is silent while a failed share remains retryable', async () => {
  const file = await rensheService.getCommitmentTemplateFile(42, '模板.pdf')
  Taro.shareFileMessage = async () => { throw { errMsg: 'shareFileMessage:fail cancel' } }
  await rensheService.sendCommitmentTemplate(file)
  Taro.shareFileMessage = async () => { throw { errMsg: 'shareFileMessage:fail unknown error' } }
  await assert.rejects(rensheService.sendCommitmentTemplate(file), /文件发送未完成/)
  Taro.shareFileMessage = async options => { calls.share.push(options) }
  await rensheService.sendCommitmentTemplate(file)
  assert.equal(calls.share.length, 1)
})
