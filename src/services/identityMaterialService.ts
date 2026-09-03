import Taro from '@tarojs/taro'
import { getToken } from '../utils/request.ts'

export type IdentityMaterialKind = 'id_card_front' | 'id_card_back' | 'portrait'

export interface IdentityMaterialUploadResult {
  kind: IdentityMaterialKind
  storage_key: string
  original_filename: string
  content_type: string
  size_bytes: number
  sha256: string
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
