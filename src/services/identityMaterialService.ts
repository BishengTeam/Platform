import Taro from '@tarojs/taro'
import { get, getToken } from '../utils/request.ts'

export type IdentityMaterialKind = 'id_card_front' | 'id_card_back' | 'portrait'

export interface IdentityMaterialUploadResult {
  kind: IdentityMaterialKind
  storage_key: string
  original_filename: string
  content_type: string
  size_bytes: number
  sha256: string
}

export interface IdentityMaterialSignedUrl {
  url: string
  /** 签名有效期（秒），后端上限 300 */
  expires_in: number
}

/**
 * POST /api/renshe/verification-materials/{kind}
 * 实名认证材料必须走私有材料接口；通用 /api/upload 返回的 /api/media/* 不允许提交。
 */
export async function uploadIdentityMaterial(
  filePath: string,
  kind: IdentityMaterialKind,
): Promise<IdentityMaterialUploadResult> {
  const token = getToken()
  const baseUrl = (process.env.TARO_APP_API_BASE || '').replace(/\/+$/, '')
  const response = await Taro.uploadFile({
    url: `${baseUrl}/api/renshe/verification-materials/${kind}`,
    filePath,
    name: 'file',
    header: { Authorization: token ? `Bearer ${token}` : '' },
  })

  let payload: { code: number; data: IdentityMaterialUploadResult; message: string }
  try {
    payload = JSON.parse(response.data)
  } catch {
    throw new Error('实名材料上传响应无效')
  }
  if (payload.code !== 0 || !payload.data?.storage_key) {
    throw new Error(payload.message || '实名材料上传失败')
  }
  return payload.data
}

/**
 * GET /api/renshe/verification-materials/{kind}/signed-url
 * 本人私有材料的短时预览链接（头像等展示必须走此接口，OSS 键不可直接渲染）。
 */
export async function getVerificationMaterialSignedUrl(
  kind: IdentityMaterialKind,
  download = false,
): Promise<IdentityMaterialSignedUrl> {
  const res = await get<IdentityMaterialSignedUrl>(
    `/api/renshe/verification-materials/${kind}/signed-url`,
    download ? { download: 'true' } : undefined,
  )
  return res.data
}
