import { useEffect, useState } from 'react'
import { View, Text, RichText } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { getClassroomSubmissionDetail } from '@/services/classroomService'
import type { ClassroomAttachmentItem, ClassroomSubmissionDetail } from '@/types/classroom'
import styles from './result.module.scss'

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${bytes}B`
}

export default function ClassroomResultPage() {
  const { params } = useRouter()
  const quizId = Number(params?.id)
  const [detail, setDetail] = useState<ClassroomSubmissionDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!quizId) { setLoading(false); return }
    getClassroomSubmissionDetail(quizId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false))
  }, [quizId])

  const previewAttachment = (item: ClassroomAttachmentItem) => {
    if (item.kind === 'image') {
      void Taro.previewImage({ urls: [item.url] })
      return
    }
    if (item.kind === 'archive') {
      Taro.showToast({ title: '压缩包不支持预览', icon: 'none' })
      return
    }
    Taro.showLoading({ title: '下载中…' })
    Taro.downloadFile({
      url: item.url,
      success: (res) => {
        Taro.hideLoading()
        void Taro.openDocument({ filePath: res.tempFilePath, fileType: item.filename.endsWith('.docx') ? 'docx' : 'doc', showMenu: true })
      },
      fail: () => {
        Taro.hideLoading()
        Taro.showToast({ title: '预览失败，请稍后重试', icon: 'none' })
      },
    })
  }

  const attachmentsOf = (qid: number): ClassroomAttachmentItem[] =>
    (detail?.attachments || []).filter((item) => item.question_id === qid)

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='我的答卷' shouldShowBack />
        <View className={styles.body}>
          {loading && <View className={styles.empty}>加载中…</View>}
          {!loading && !detail && <View className={styles.empty}>答卷不存在</View>}

          {detail?.status === 'pending_review' && (
            <View className={styles.stateCard}>
              <Text className={styles.stateTitle}>等待老师批改</Text>
              <Text className={styles.stateHint}>批改完成后可在这里查看分数、作答内容与附件</Text>
            </View>
          )}

          {detail?.status === 'approved' && (
            <>
              <View className={styles.scoreCard}>
                <Text className={styles.scoreLabel}>总分</Text>
                <Text className={styles.scoreValue}>{detail.total_score ?? '-'}</Text>
              </View>
              {(detail.questions || []).map((q, i) => (
                <View key={q.id} className={styles.question}>
                  <View className={styles.stemRow}>
                    <Text className={styles.stemIndex}>{i + 1}.</Text>
                    <Text className={styles.stem}>{q.stem}</Text>
                    <Text className={styles.score}>({q.score}分)</Text>
                  </View>
                  {q.type === 'short' ? (
                    <View className={styles.answerBlock}>
                      <Text className={styles.answerLabel}>我的作答</Text>
                      <View className={styles.richText}>
                        <RichText nodes={detail.answers?.[String(q.id)] || '<p>（未作答）</p>'} />
                      </View>
                    </View>
                  ) : (
                    <View className={styles.answerBlock}>
                      <Text className={styles.answerLabel}>我的作答</Text>
                      <Text className={styles.plainAnswer}>{detail.answers?.[String(q.id)] || '（未作答）'}</Text>
                    </View>
                  )}
                  {attachmentsOf(q.id).length > 0 && (
                    <View className={styles.fileList}>
                      <Text className={styles.answerLabel}>附件</Text>
                      {attachmentsOf(q.id).map((item) => (
                        <View key={item.id} className={styles.fileRow} onClick={() => previewAttachment(item)}>
                          <Text className={styles.fileIcon}>
                            {item.kind === 'image' ? '🖼' : item.kind === 'document' ? '📄' : '🗜'}
                          </Text>
                          <View className={styles.fileMeta}>
                            <Text className={styles.fileName}>{item.filename}</Text>
                            <Text className={styles.fileSize}>{formatSize(item.size_bytes)}</Text>
                          </View>
                          <Text className={styles.fileAction}>{item.kind === 'archive' ? '下载' : '预览'}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </>
          )}
        </View>
      </View>
    </AuthGuard>
  )
}
