import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import Taro from '@tarojs/taro'
import { clearAuthTokens, setAuthTokens } from '../src/utils/request.ts'
import { uploadIdentityMaterial } from '../src/services/identityMaterialService.ts'
import { validateIdCard } from '../src/utils/validator.ts'

function installStorage() {
  const storage = new Map()
  Taro.getStorageSync = key => storage.get(key) ?? ''
  Taro.setStorageSync = (key, value) => storage.set(key, value)
  Taro.removeStorageSync = key => storage.delete(key)
  Taro.getStorageInfoSync = () => ({ keys: [...storage.keys()] })
  return storage
}

function installRequestStubs() {
  Taro.showLoading = () => undefined
  Taro.hideLoading = () => undefined
  Taro.showToast = () => undefined
}

test('identity materials use the private Renshe upload endpoint', async () => {
  installStorage()
  installRequestStubs()
  let upload = null
  Taro.uploadFile = async options => {
    upload = options
    return {
      data: JSON.stringify({
        code: 0,
        data: {
          kind: 'portrait',
          storage_key: 'renshe/source/9/portrait.jpg',
          original_filename: 'portrait.jpg',
          content_type: 'image/jpeg',
          size_bytes: 1024,
          sha256: 'a'.repeat(64),
        },
        message: 'ok',
      }),
    }
  }
  setAuthTokens('access-token', 'refresh-token')

  const result = await uploadIdentityMaterial('/tmp/portrait.jpg', 'portrait')

  assert.equal(result.storage_key, 'renshe/source/9/portrait.jpg')
  assert.equal(upload.url.endsWith('/api/renshe/verification-materials/portrait'), true)
  assert.equal(upload.name, 'file')
  assert.equal(upload.filePath, '/tmp/portrait.jpg')
  assert.equal(upload.header.Authorization, 'Bearer access-token')
  clearAuthTokens()
})

test('ID-card validator checks the GB 11643 checksum', () => {
  assert.deepEqual(validateIdCard('11010519491231002X'), { valid: true, message: '' })
  assert.deepEqual(validateIdCard('110105194912310021'), {
    valid: false,
    message: '身份证号校验位不正确',
  })
})

test('identity update posts the complete schema directly', async () => {
  const service = await readFile('src/services/userService.ts', 'utf8')

  assert.match(service, /post<UserProfileAggregated>\(\s*'\/api\/user\/identity'/)
  assert.doesNotMatch(service, /const current = await get<.*UserRealnameL2>\('\/api\/user\/identity'\)/)
  assert.match(service, /页面必须提交完整实名字段/)
})

test('identity page submits private storage keys rather than public media URLs', async () => {
  const page = await readFile('src/pages/mine/edit-profile.tsx', 'utf8')

  assert.match(page, /uploadPrivateMaterial\(idCardFrontFile, 'id_card_front'/)
  assert.match(page, /uploadPrivateMaterial\(idCardBackFile, 'id_card_back'/)
  assert.match(page, /uploadPrivateMaterial\(avatarFile, 'portrait'/)
  assert.doesNotMatch(page, /uploadFile\(idCardFrontFile/)
  assert.doesNotMatch(page, /uploadFile\(idCardBackFile/)
  assert.doesNotMatch(page, /uploadFile\(avatarFile/)
  assert.match(page, /avatar_oss: avatarOssFinal/)
  assert.match(page, /political_status: politicalStatus\.trim\(\)/)
  assert.match(page, /ethnicity: ethnicity\.trim\(\)/)
})

test('registration pages no longer submit lightweight identity without materials', async () => {
  const hook = await readFile('src/hooks/useIdentityCheck.ts', 'utf8')
  const gate = await readFile('src/pages/registration/components/IdentityCheckGate.tsx', 'utf8')
  const sangfor = await readFile('src/pages/registration/form-sangfor.tsx', 'utf8')
  const nisp = await readFile('src/pages/registration/form-nisp.tsx', 'utf8')
  const renshe = await readFile('src/pages/registration/form-renshe.tsx', 'utf8')

  assert.doesNotMatch(hook, /submitIdentity/)
  assert.doesNotMatch(hook, /'submitting'/)
  assert.match(gate, /pages\/mine\/edit-profile/)
  for (const source of [sangfor, nisp, renshe]) {
    assert.doesNotMatch(source, /identity\.submit\(/)
    assert.match(source, /pages\/mine\/edit-profile/)
  }
})
