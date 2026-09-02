import { useEffect, useRef, useState } from 'react'
import { View, Text, Input, Radio, RadioGroup, Checkbox, CheckboxGroup, Editor } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import {
  createClassroomAttachmentUpload,
  deleteClassroomAttachment,
  getClassroomAttachments,
  getQuizPaper,
  submitQuiz,
} from '@/services/classroomService'
import type { ClassroomAttachmentItem, ClassroomQuizPaper } from '@/types/classroom'
import styles from './quiz.module.scss'

/** EditorContext 的结构化最小类型（避免依赖平台细节） */
interface EditorCtx {
  format: (name: string, value?: string) => void
  insertImage: (options: { src: string }) => void
}

const IMAGE_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}
const FILE_MIME: Record<string, string> = {
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  zip: 'application/zip',
}
const IMAGE_LIMIT_BYTES = 10 * 1024 * 1024
const DOCUMENT_LIMIT_BYTES = 20 * 1024 * 1024
const ARCHIVE_LIMIT_BYTES = 50 * 1024 * 1024
const SUBMIT_UPLOAD_GRACE_MS = 30 * 1000

function extOf(path: string): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(path)
  return match ? match[1].toLowerCase() : ''
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${bytes}B`
}

function groupByQuestion(items: ClassroomAttachmentItem[]): Record<string, ClassroomAttachmentItem[]> {
  const grouped: Record<string, ClassroomAttachmentItem[]> = {}
  for (const item of items) {
    const key = String(item.question_id)
    ;(grouped[key] ||= []).push(item)
  }
  return grouped
}

async function uploadToOss(uploadUrl: string, filePath: string, contentType: string): Promise<void> {
  const fs = Taro.getFileSystemManager()
  const buffer = fs.readFileSync(filePath) as ArrayBuffer
  const res = await Taro.request({
    url: uploadUrl,
    method: 'PUT',
    data: buffer,
    header: { 'Content-Type': contentType },
    timeout: 60000,
  })
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(`文件上传失败(${res.statusCode})`)
  }
}

export default function ClassroomQuizPage() {
  const { params } = useRouter()
  const quizId = Number(params?.id)
  const [paper, setPaper] = useState<ClassroomQuizPaper | null>(null)
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [attachments, setAttachments] = useState<Record<string, ClassroomAttachmentItem[]>>({})
  const [remaining, setRemaining] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingCount, setUploadingCount] = useState(0)
  const editorCtxMap = useRef<Record<number, EditorCtx>>({})
  const uploadingRef = useRef(0)

  useEffect(() => {
    if (!quizId) { setLoading(false); return }
    Promise.all([getQuizPaper(quizId), getClassroomAttachments(quizId)])
      .then(([p, drafts]) => {
        setPaper(p)
        setAttachments(groupByQuestion(drafts))
        setRemaining(Math.max(0, Math.floor((new Date(p.ends_at).getTime() - Date.now()) / 1000)))
      })
      .catch(() => setPaper(null))
      .finally(() => setLoading(false))
  }, [quizId])

  // 倒计时
  useEffect(() => {
    if (!paper) return
    const timer = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000)
    return () => clearInterval(timer)
  }, [paper])

  const setAnswer = (qid: number, value: string) =>
    setAnswers((prev) => ({ ...prev, [String(qid)]: value }))

  const toggleMulti = (qid: number, index: number) => {
    const key = String(qid)
    const current = (answers[key] || '').split(',').filter(Boolean)
    const idx = current.indexOf(String(index))
    if (idx >= 0) current.splice(idx, 1)
    else current.push(String(index))
    setAnswer(qid, current.sort().join(','))
  }

  const beginUpload = () => {
    uploadingRef.current += 1
    setUploadingCount(uploadingRef.current)
  }
  const endUpload = () => {
    uploadingRef.current = Math.max(0, uploadingRef.current - 1)
    setUploadingCount(uploadingRef.current)
  }

  const refreshAttachments = async () => {
    const drafts = await getClassroomAttachments(quizId)
    setAttachments(groupByQuestion(drafts))
    return drafts
  }

  const onEditorReady = (qid: number) => {
    Taro.createSelectorQuery()
      .select(`#editor-q${qid}`)
      .context((res) => {
        if (res?.context) editorCtxMap.current[qid] = res.context as EditorCtx
      })
      .exec()
  }

  const applyFormat = (qid: number, name: string, value?: string) => {
    const ctx = editorCtxMap.current[qid]
    if (!ctx) {
      Taro.showToast({ title: '编辑器未就绪', icon: 'none' })
      return
    }
    ctx.format(name, value)
  }

  // Editor 插图：选图 → 预签名 PUT 直传 → 列表刷新拿签名读地址 → insertImage
  const insertEditorImage = async (qid: number) => {
    try {
      const choose = await Taro.chooseMedia({ count: 1, mediaType: ['image'], sizeType: ['compressed'] })
      const file = choose.tempFiles[0]
      const ext = extOf(file.tempFilePath) || 'jpg'
      const mime = IMAGE_MIME[ext]
      if (!mime) {
        Taro.showToast({ title: '仅支持 JPG、PNG、WebP 图片', icon: 'none' })
        return
      }
      if (file.size > IMAGE_LIMIT_BYTES) {
        Taro.showToast({ title: '图片不能超过 10MB', icon: 'none' })
        return
      }
      const ctx = editorCtxMap.current[qid]
      if (!ctx) {
        Taro.showToast({ title: '编辑器未就绪', icon: 'none' })
        return
      }
      beginUpload()
      try {
        const target = await createClassroomAttachmentUpload(
          quizId, qid, `插图-${Date.now()}.${ext}`, mime, file.size,
        )
        await uploadToOss(target.upload_url, file.tempFilePath, mime)
        const drafts = await refreshAttachments()
        const url = drafts.find((item) => item.id === target.attachment_id)?.url
        if (url) ctx.insertImage({ src: url })
        else Taro.showToast({ title: '插图失败，请重试', icon: 'none' })
      } finally {
        endUpload()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '插图失败'
      Taro.showToast({ title: message, icon: 'none' })
    }
  }

  // 附件区：Word / zip 从聊天记录选文件（手机端平台限制）
  const uploadAttachmentFile = async (qid: number) => {
    try {
      const choose = await Taro.chooseMessageFile({ count: 1, type: 'file', extension: ['doc', 'docx', 'zip'] })
      const file = choose.tempFiles[0]
      if (!file) return
      const ext = extOf(file.name || file.path) || extOf(file.path)
      const mime = FILE_MIME[ext]
      if (!mime) {
        Taro.showToast({ title: '仅支持 Word(doc/docx) 或 zip', icon: 'none' })
        return
      }
      const limit = ext === 'zip' ? ARCHIVE_LIMIT_BYTES : DOCUMENT_LIMIT_BYTES
      const limitLabel = ext === 'zip' ? '50MB' : '20MB'
      if (file.size > limit) {
        Taro.showToast({ title: `文件不能超过 ${limitLabel}`, icon: 'none' })
        return
      }
      beginUpload()
      try {
        const target = await createClassroomAttachmentUpload(
          quizId, qid, file.name || `附件-${Date.now()}.${ext}`, mime, file.size,
        )
        await uploadToOss(target.upload_url, file.path, mime)
        await refreshAttachments()
      } finally {
        endUpload()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '上传失败'
      Taro.showToast({ title: message, icon: 'none' })
    }
  }

  const previewAttachment = (item: ClassroomAttachmentItem) => {
    if (item.kind === 'image') {
      void Taro.previewImage({ urls: [item.url] })
      return
    }
    if (item.kind === 'archive') {
      Taro.showToast({ title: '压缩包不支持预览，交卷后老师可下载', icon: 'none', duration: 2500 })
      return
    }
    Taro.showLoading({ title: '下载中…' })
    Taro.downloadFile({
      url: item.url,
      success: (res) => {
        Taro.hideLoading()
        const ext = extOf(item.filename) || 'docx'
        void Taro.openDocument({ filePath: res.tempFilePath, fileType: ext === 'docx' ? 'docx' : 'doc', showMenu: true })
      },
      fail: () => {
        Taro.hideLoading()
        Taro.showToast({ title: '预览失败，请稍后重试', icon: 'none' })
      },
    })
  }

  const removeAttachment = async (item: ClassroomAttachmentItem) => {
    const { confirm } = await Taro.showModal({ title: '删除附件', content: `删除「${item.filename}」？` })
    if (!confirm) return
    try {
      await deleteClassroomAttachment(quizId, item.id)
      await refreshAttachments()
    } catch { /* request 层 toast */ }
  }

  // 交卷宽限：存在未完成上传时确认并最多等待 30 秒
  const waitForUploads = async (): Promise<boolean> => {
    if (uploadingRef.current === 0) return true
    const { confirm } = await Taro.showModal({
      title: '文件还在上传',
      content: `还有 ${uploadingRef.current} 个文件正在上传，最多等待 30 秒，超时将无法交卷。`,
      confirmText: '等待完成',
    })
    if (!confirm) return false
    const deadline = Date.now() + SUBMIT_UPLOAD_GRACE_MS
    while (uploadingRef.current > 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
    if (uploadingRef.current > 0) {
      Taro.showToast({ title: '仍有文件未上传完成', icon: 'none' })
      return false
    }
    return true
  }

  const hasAnswer = (qid: number, type: string) => {
    const value = (answers[String(qid)] || '').trim()
    if (type === 'short' && /<img\b/i.test(value)) return true
    return value.replace(/<[^>]+>/g, '').length > 0
  }

  const doSubmit = async () => {
    if (!paper || submitting) return
    const unanswered = paper.questions.filter((q) => !hasAnswer(q.id, q.type)).length
    if (unanswered > 0) {
      const { confirm } = await Taro.showModal({
        title: '还有未作答题目',
        content: `剩余 ${unanswered} 题未作答，确认交卷？`,
      })
      if (!confirm) return
    }
    if (!(await waitForUploads())) return
    const attachmentPayload: Record<string, number[]> = {}
    for (const [qid, items] of Object.entries(attachments)) {
      attachmentPayload[qid] = items.map((item) => item.id)
    }
    setSubmitting(true)
    try {
      await submitQuiz(quizId, answers, attachmentPayload)
      Taro.showToast({ title: '已提交，等待老师批改', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 1200)
    } catch { /* request 层 toast */ } finally {
      setSubmitting(false)
    }
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={paper?.title || '随堂测验'} shouldShowBack />
        {paper && (
          <View className={styles.countdown}>
            <Text className={remaining < 300 ? styles.countdownWarn : styles.countdownText}>
              剩余 {mm}:{ss}
            </Text>
          </View>
        )}
        <View className={styles.body}>
          {loading && <View className={styles.empty}>加载中…</View>}
          {!loading && !paper && <View className={styles.empty}>测验不存在或已结束</View>}

          {paper?.questions.map((q, i) => (
            <View key={q.id} className={styles.question}>
              <View className={styles.stemRow}>
                <Text className={styles.stemIndex}>{i + 1}.</Text>
                <Text className={styles.stem}>{q.stem}</Text>
                <Text className={styles.score}>({q.score}分)</Text>
              </View>

              {(q.type === 'single' || q.type === 'judge') && (
                <RadioGroup onChange={(e: { detail: { value: string } }) => setAnswer(q.id, String(e.detail.value))}>
                  {(q.type === 'judge' ? ['正确', '错误'] : (q.options ?? [])).map((opt, oi) => (
                    <Radio key={oi} value={q.type === 'judge' ? (oi === 0 ? 'true' : 'false') : String(oi)} className={styles.option}>
                      {q.type === 'judge' ? opt : `${String.fromCharCode(65 + oi)}. ${opt}`}
                    </Radio>
                  ))}
                </RadioGroup>
              )}

              {q.type === 'multiple' && (
                <CheckboxGroup onChange={(e: { detail: { value: string[] } }) => setAnswer(q.id, [...e.detail.value].sort().join(','))}>
                  {(q.options ?? []).map((opt, oi) => (
                    <Checkbox key={oi} value={String(oi)} className={styles.option}>
                      {`${String.fromCharCode(65 + oi)}. ${opt}`}
                    </Checkbox>
                  ))}
                </CheckboxGroup>
              )}

              {q.type === 'blank' && (
                <Input
                  className={styles.input}
                  placeholder='填写答案'
                  value={answers[String(q.id)] || ''}
                  onInput={(e) => setAnswer(q.id, e.detail.value)}
                />
              )}

              {q.type === 'short' && (
                <View className={styles.essayBlock}>
                  <View className={styles.toolbar}>
                    <View className={styles.toolBtn} onClick={() => applyFormat(q.id, 'bold')}><Text>B</Text></View>
                    <View className={`${styles.toolBtn} ${styles.toolItalic}`} onClick={() => applyFormat(q.id, 'italic')}><Text>I</Text></View>
                    <View className={styles.toolBtn} onClick={() => applyFormat(q.id, 'underline')}><Text>U</Text></View>
                    <View className={styles.toolBtn} onClick={() => applyFormat(q.id, 'strike')}><Text>S</Text></View>
                    <View className={styles.toolBtn} onClick={() => applyFormat(q.id, 'header', '2')}><Text>H2</Text></View>
                    <View className={styles.toolBtn} onClick={() => applyFormat(q.id, 'header', '3')}><Text>H3</Text></View>
                    <View className={styles.toolBtn} onClick={() => void insertEditorImage(q.id)}><Text>图片</Text></View>
                  </View>
                  <Editor
                    id={`editor-q${q.id}`}
                    className={styles.editor}
                    placeholder='输入解答，可插入图片'
                    onReady={() => onEditorReady(q.id)}
                    onInput={(e) => setAnswer(q.id, e.detail.html || '')}
                  />
                  <View className={styles.attachSection}>
                    <View className={styles.attachBtns}>
                      <View className={styles.attachBtn} onClick={() => void insertEditorImage(q.id)}>
                        <Text>传图片</Text>
                      </View>
                      <View className={styles.attachBtn} onClick={() => void uploadAttachmentFile(q.id)}>
                        <Text>传 Word / zip</Text>
                      </View>
                    </View>
                    <Text className={styles.attachHint}>Word/zip 可从微信聊天记录选择；每题图片≤9张、文件≤5个</Text>
                    {(attachments[String(q.id)] || []).length > 0 && (
                      <View className={styles.fileList}>
                        {(attachments[String(q.id)] || []).map((item) => (
                          <View key={item.id} className={styles.fileRow}>
                            <Text className={styles.fileIcon}>
                              {item.kind === 'image' ? '🖼' : item.kind === 'document' ? '📄' : '🗜'}
                            </Text>
                            <View className={styles.fileMeta}>
                              <Text className={styles.fileName}>{item.filename}</Text>
                              <Text className={styles.fileSize}>{formatSize(item.size_bytes)}</Text>
                            </View>
                            <View className={styles.fileActions}>
                              <Text className={styles.fileActionBtn} onClick={() => previewAttachment(item)}>预览</Text>
                              <Text className={styles.fileActionBtn} onClick={() => void removeAttachment(item)}>删除</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                    {uploadingCount > 0 && (
                      <Text className={styles.uploadingTag}>{uploadingCount} 个文件上传中…</Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          ))}

          {paper && (
            <Button variant='primary' disabled={submitting} onClick={doSubmit} className={styles.submit}>
              {submitting ? '提交中…' : '交卷'}
            </Button>
          )}
        </View>
      </View>
    </AuthGuard>
  )
}
