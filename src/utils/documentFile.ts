import Taro from '@tarojs/taro'

export interface LocalDocumentFile {
  filePath: string
  filename: string
  fileType: 'pdf' | 'docx'
}

export const FILE_SHARE_UNSUPPORTED = '当前微信版本暂不支持直接发送文件，可先预览，并使用预览器提供的其他应用打开功能'

export function canSendDocumentFile(): boolean {
  try {
    return typeof Taro.shareFileMessage === 'function' && typeof Taro.canIUse === 'function' && Taro.canIUse('shareFileMessage')
  } catch { return false }
}

export async function downloadDocumentFile(options: {
  url: string; filename?: string; header?: Record<string, string>
  fallbackName?: string; failureMessage?: string; missingMessage?: string
}): Promise<LocalDocumentFile> {
  const failure = options.failureMessage || '文件获取失败，请重试'
  let response: Taro.downloadFile.FileSuccessCallbackResult
  try {
    response = await Taro.downloadFile({ url: options.url, ...(options.header ? { header: options.header } : {}) })
  } catch { throw new Error(failure) }
  if (response.statusCode === 401) throw new Error('登录已失效，请重新登录后重试')
  if (response.statusCode === 404) throw new Error(options.missingMessage || '暂无可用文档，请联系管理员')
  if (response.statusCode !== 200 || !response.tempFilePath) throw new Error(failure)
  // Reject empty files and HTTP-200 HTML/JSON error pages before opening or sharing.
  const bytes = await new Promise<Uint8Array>((resolve, reject) => {
    try {
      Taro.getFileSystemManager().readFile({
        filePath: response.tempFilePath,
        success: result => resolve(new Uint8Array(result.data as ArrayBuffer)),
        fail: reject,
      })
    } catch (error) { reject(error) }
  }).catch(() => { throw new Error(failure) })
  const fileType = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d ? 'pdf'
    : bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04 ? 'docx' : null
  if (!fileType) throw new Error(failure)
  const name = options.filename?.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f\u007f]/g, '').trim()
  const extension = name?.match(/\.([^.]+)$/)?.[1]?.toLowerCase()
  if (extension && extension !== fileType) throw new Error(failure)
  return { filePath: response.tempFilePath, filename: name ? extension ? name : `${name}.${fileType}` : `${options.fallbackName || '文档'}.${fileType}`, fileType }
}

export async function previewDocumentFile(file: LocalDocumentFile): Promise<void> {
  try {
    await Taro.openDocument({ filePath: file.filePath, fileType: file.fileType, showMenu: true })
  } catch { throw new Error('无法预览此文件，可尝试发送到微信后打开') }
}

export async function sendDocumentFile(file: LocalDocumentFile): Promise<void> {
  if (!canSendDocumentFile()) throw new Error(FILE_SHARE_UNSUPPORTED)
  try {
    await Taro.shareFileMessage({ filePath: file.filePath, fileName: file.filename })
  } catch (error) {
    if (/\bcancel(?:led|ed)?\b/i.test(String((error as { errMsg?: string; message?: string })?.errMsg || (error as Error)?.message || ''))) return
    throw new Error('文件发送未完成，请重试或使用预览')
  }
}
