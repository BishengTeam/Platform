import { get } from '../utils/request.ts'
import { downloadDocumentFile } from '../utils/documentFile.ts'

export const H3C_XUEXIN_VERIFICATION_GUIDE_KEY = 'h3c.xuexin_verification_guide'
export const H3C_STUDENT_XUEXIN_GUIDE_SCENE = 'h3c_student_xuexin_guide'
export const DEFAULT_H3C_XUEXIN_GUIDE_ENTRY_TEXT = '查看《如何查询学籍在线验证码》PDF'
export const NISP_EDUCATION_REPORT_GUIDE_SCENE = 'nisp_education_report_guide'
export const NISP_LEVEL2_APPLICATION_FORM_SCENE = 'nisp_level2_application_form'
export const DEFAULT_NISP_EDUCATION_REPORT_ENTRY_TEXT = '查看《学历证书电子注册备案表》查询步骤PDF'
export const DEFAULT_NISP_APPLICATION_FORM_ENTRY_TEXT = '《NISP二级考试报名申请表》PDF'

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

export async function getSceneDocumentFile(scene: string) {
  try {
    // Refresh both the binding and its signed URL; never reuse an expired download link.
    const slot = await getDocumentScene(scene)
    if (!slot.document) throw new Error('文档暂未配置，请联系管理员')
    const document = await getDocument(slot.document.document_key)
    return await downloadDocumentFile({ url: document.download_url, filename: document.original_filename })
  } catch (error) {
    if ((error as Error)?.message === 'UNAUTHORIZED' || (error as { statusCode?: number })?.statusCode === 401) {
      throw new Error('登录已失效，请重新登录后重试')
    }
    if ((error as { statusCode?: number })?.statusCode === 404) throw new Error('暂无可用文档，请联系管理员')
    throw error
  }
}
