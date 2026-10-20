import { useRef, useState } from 'react'
import { getSceneDocumentFile } from '../services/documentService.ts'
import { canSendDocumentFile, FILE_SHARE_UNSUPPORTED, previewDocumentFile, sendDocumentFile } from '../utils/documentFile.ts'

export function useDocumentActions() {
  const lock = useRef(false)
  const [busy, setBusy] = useState<{ scene: string; action: 'preview' | 'send' } | null>(null)
  const [error, setError] = useState<{ scene: string; message: string } | null>(null)
  const [shareSupported, setShareSupported] = useState(canSendDocumentFile)

  const run = async (scene: string, action: 'preview' | 'send') => {
    if (lock.current) return
    setError(null)
    if (action === 'send') {
      const supported = canSendDocumentFile()
      setShareSupported(supported)
      if (!supported) { setError({ scene, message: FILE_SHARE_UNSUPPORTED }); return }
    }
    lock.current = true
    setBusy({ scene, action })
    try {
      const file = await getSceneDocumentFile(scene)
      if (action === 'preview') await previewDocumentFile(file)
      else await sendDocumentFile(file)
    } catch (value) {
      setError({ scene, message: value instanceof Error ? value.message : '文档获取失败，请重试' })
    } finally { lock.current = false; setBusy(null) }
  }
  return { busy, error, shareSupported, run }
}

export type DocumentActionsController = ReturnType<typeof useDocumentActions>
