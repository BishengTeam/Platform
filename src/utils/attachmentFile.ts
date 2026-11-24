export type AttachmentDocumentType =
  | 'pdf'
  | 'doc'
  | 'docx'
  | 'xls'
  | 'xlsx'
  | 'ppt'
  | 'pptx'

const DOCUMENT_TYPES: Record<string, AttachmentDocumentType> = {
  pdf: 'pdf',
  doc: 'doc',
  docx: 'docx',
  xls: 'xls',
  xlsx: 'xlsx',
  ppt: 'ppt',
  pptx: 'pptx',
}

export function attachmentExtension(url: string): string {
  try {
    const pathname = url.split(/[?#]/, 1)[0] || ''
    return decodeURIComponent(pathname).split('.').pop()?.toLowerCase() || ''
  } catch {
    return (url.split('?')[0].split('#')[0].split('.').pop() || '').toLowerCase()
  }
}

export function attachmentDocumentType(url: string): AttachmentDocumentType | null {
  return DOCUMENT_TYPES[attachmentExtension(url)] || null
}

export function attachmentBytesMatchType(
  fileType: AttachmentDocumentType,
  bytes: Uint8Array,
): boolean {
  const startsWith = (signature: number[]) => (
    signature.every((value, index) => bytes[index] === value)
  )
  if (fileType === 'pdf') return startsWith([0x25, 0x50, 0x44, 0x46, 0x2d])
  if (['docx', 'xlsx', 'pptx'].includes(fileType)) {
    return startsWith([0x50, 0x4b, 0x03, 0x04])
  }
  return startsWith([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
}
