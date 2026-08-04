import { useState, useEffect } from 'react'
import { View, Text, ScrollView, Video } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import { getCourseContent } from '@/services/dataService'
import type { CourseContent as CourseContentType, CourseChapter } from '@/types'
import styles from './content.module.scss'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function CourseContentPage() {
  const [courseId, setCourseId] = useState('')
  const [content, setContent] = useState<CourseContentType | null>(null)
  const [currentChapter, setCurrentChapter] = useState<CourseChapter | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useLoad((options) => {
    setCourseId(options?.id || '')
  })

  useEffect(() => {
    if (!courseId) return
    const id = Number(courseId)
    if (Number.isNaN(id)) {
      setError(STRINGS.COURSE_NOT_FOUND)
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    getCourseContent(id)
      .then((data) => {
        if (data) {
          setContent(data)
          setCurrentChapter(data.chapters?.[0] || null)
        } else {
          setError(STRINGS.COURSE_NOT_FOUND)
        }
      })
      .catch((err) => {
        console.error('[CourseContent] load error:', err)
        setError(err?.message || STRINGS.COURSE_LOAD_ERROR)
      })
      .finally(() => setLoading(false))
  }, [courseId])

  const handleBuy = () => {
    if (!courseId) return
    Taro.navigateTo({ url: `/${ROUTES.COURSE_DETAIL}?id=${courseId}` })
  }

  if (loading) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.COURSE_CONTENT_TITLE} shouldShowBack />
          <View className={styles.empty}>
            <Text>加载中...</Text>
          </View>
        </View>
      </AuthGuard>
    )
  }

  if (error || !content) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.COURSE_CONTENT_TITLE} shouldShowBack />
          <View className={styles.empty}>
            <Text>{error || STRINGS.COURSE_NOT_FOUND}</Text>
          </View>
        </View>
      </AuthGuard>
    )
  }

  if (!content.has_access) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.COURSE_CONTENT_TITLE} shouldShowBack />
          <View className={styles.empty}>
            <Text className={styles.lockText}>{STRINGS.COURSE_CONTENT_LOCKED}</Text>
            <Button variant='gradient' size='md' onClick={handleBuy}>
              {STRINGS.COURSE_BUY_BTN}
            </Button>
          </View>
        </View>
      </AuthGuard>
    )
  }

  const videoUrl = currentChapter?.video_url || content.video_url

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={content.title || STRINGS.COURSE_CONTENT_TITLE} shouldShowBack />
        <View className={styles.videoWrap}>
          {videoUrl ? (
            <Video
              className={styles.video}
              src={videoUrl}
              controls
              autoplay={false}
              poster={content.cover_url || ''}
              objectFit='contain'
            />
          ) : (
            <View className={styles.videoPlaceholder}>
              <Text>{STRINGS.COURSE_CONTENT_NO_VIDEO}</Text>
            </View>
          )}
        </View>

        <ScrollView className={styles.body} scrollY>
          <Text className={styles.sectionTitle}>{STRINGS.COURSE_CONTENT_CHAPTERS}</Text>
          {content.chapters?.map((chapter, index) => (
            <View
              key={chapter.id}
              className={`${styles.chapterItem} ${
                currentChapter?.id === chapter.id ? styles.chapterActive : ''
              }`}
              onClick={() => setCurrentChapter(chapter)}
            >
              <Text className={styles.chapterIndex}>{index + 1}</Text>
              <Text className={styles.chapterTitle}>{chapter.title}</Text>
              {chapter.duration != null && (
                <Text className={styles.chapterDuration}>
                  {formatDuration(chapter.duration)}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
