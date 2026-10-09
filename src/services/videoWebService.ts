import { get, post } from '@/utils/request'

export interface VideoWebCode {
  id: number
  code: string
  course_id: number
  status: 'issued' | 'redeemed' | 'revoked' | 'refunded'
  source_order_id?: number | null
  redeemed_at?: string | null
  created_at: string
}

export async function getMyVideoWebCodes(): Promise<VideoWebCode[]> {
  const response = await get<{ items?: VideoWebCode[] } | VideoWebCode[]>('/api/videoweb/codes')
  const data = response.data
  if (Array.isArray(data)) return data
  return data?.items ?? []
}

export interface VideoWebLoginCode {
  login_code: string
  expires_in: number
}

export async function createVideoWebLoginCode(): Promise<VideoWebLoginCode> {
  const response = await post<VideoWebLoginCode>('/api/videoweb/login-code', undefined, false)
  return response.data
}
