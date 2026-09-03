import { useEffect, useState } from 'react'
import { View, Text, Video } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { getClassroomDetail, getVideoPlayUrl } from '@/services/classroomService'
import type { ClassroomDetail } from '@/types/classroom'
import styles from './detail.module.scss'

export default function ClassroomDetailPage() {
  const { params } = useRouter()
  const id = Number(params?.id)
  const [detail, setDetail] = useState<ClassroomDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [playUrl, setPlayUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!id) { setLoading(false); return }
    getClassroomDetail(id)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false))
  }, [id])

  const play = async (videoId: number) => {
    try {
      const url = await getVideoPlayUrl(videoId)
      setPlayUrl(url)
    } catch (error) { Taro.showToast({ title: error instanceof Error ? error.message : '加载失败', icon: 'none', duration: 3000 }) }
  }

  const goQuiz = (quizId: number, submitted: boolean) => {
    if (submitted) {
      // 已交卷 → 回看页：批改完成前仅显示状态，批改后回发作答与附件
      Taro.navigateTo({ url: `/pages/classroom/result?id=${quizId}` })
      return
    }
    Taro.navigateTo({ url: `/pages/classroom/quiz?id=${quizId}` })
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader
          title={detail?.name || '课堂'}
          shouldShowBack
          rightContent={
            detail?.status === 'stopped' ? (
              <Text className={styles.endedBadge}>已结束</Text>
            ) : undefined
          }
        />
        <View className={styles.body}>
          {loading && <View className={styles.empty}>加载中…</View>}
          {!loading && !detail && <View className={styles.empty}>课堂不存在或已停课</View>}

          {detail && (
            <>
              {detail.videos.length > 0 && (
                <View className={styles.section}>
                  <Text className={styles.sectionTitle}>课堂视频</Text>
                  {detail.videos.map((v) => (
                    <View key={v.id} className={styles.videoItem} onClick={() => play(v.id)}>
                      <Text className={styles.videoTitle}>{v.title}</Text>
                      <Text className={styles.videoDuration}>
                        {Math.floor(v.duration_seconds / 60)}分{v.duration_seconds % 60}秒
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {detail.quizzes.length > 0 && (
                <View className={styles.section}>
                  <Text className={styles.sectionTitle}>随堂测验</Text>
                  {detail.quizzes.map((q) => (
                    <View
                      key={q.id}
                      className={q.submitted ? `${styles.quizItem} ${styles.quizItemReview}` : styles.quizItem}
                      onClick={q.submitted ? () => goQuiz(q.id, true) : undefined}
                    >
                      <View className={styles.quizInfo}>
                        <Text className={styles.quizTitle}>{q.title}</Text>
                        <Text className={styles.quizMeta}>
                          {q.status === 'ongoing' ? `限时 ${q.duration_minutes} 分钟` : '已结束'}
                        </Text>
                      </View>
                      {q.status === 'ongoing' && !q.submitted && (
                        <Button variant='primary' onClick={() => goQuiz(q.id, q.submitted)} className={styles.quizBtn}>
                          开始答题
                        </Button>
                      )}
                      {q.submitted && (
                        <Text className={q.submission_status === 'approved' ? styles.reviewReady : styles.submitted}>
                          {q.submission_status === 'approved' ? '已批改 · 查看结果' : '待批改'}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {playUrl && (
          <View className={styles.videoMask} onClick={() => setPlayUrl(null)}>
            <Video
              src={playUrl}
              controls
              autoplay
              className={styles.videoPlayer}
              onClick={(e) => e.stopPropagation()}
            />
          </View>
        )}
      </View>
    </AuthGuard>
  )
}
