import { get } from '../utils/request.ts'

export const H3C_XUEXIN_VERIFICATION_GUIDE_KEY = 'h3c.xuexin_verification_guide'
export const H3C_STUDENT_XUEXIN_GUIDE_SCENE = 'h3c_student_xuexin_guide'
export const DEFAULT_H3C_XUEXIN_GUIDE_ENTRY_TEXT = '查看《如何查询学籍在线验证码》PDF'

export type DocumentEntryMode = 'required' | 'optional'

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

export interface DocumentSummary {
  document_key: string
  title: string
  version_no: number
  size_bytes: number
}

export interface DocumentSceneSlot {
  scene: string
  entry_text: string
  entry_mode: DocumentEntryMode
  document: DocumentSummary | null
}

export async function getDocument(documentKey: string): Promise<DocumentResource> {
  return (await get<DocumentResource>(`/api/documents/${documentKey}`)).data
}

export async function getDocumentScene(scene: string): Promise<DocumentSceneSlot> {
  return (await get<DocumentSceneSlot>(`/api/documents/scenes/${scene}`)).data
}
