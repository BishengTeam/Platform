import { get } from '../utils/request.ts'

export const H3C_XUEXIN_VERIFICATION_GUIDE_KEY = 'h3c.xuexin_verification_guide'

export interface DocumentResource {
  document_key: string
  title: string
  description: string | null
  original_filename: string
  content_type: 'application/pdf'
  size_bytes: number
  sha256: string
  version_no: number
  download_url: string
  expires_at: string
}

export async function getDocument(documentKey: string): Promise<DocumentResource> {
  return (await get<DocumentResource>(`/api/documents/${documentKey}`)).data
}
