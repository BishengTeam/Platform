import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, Video } from '@tarojs/components'
import Taro, { useLoad, useUnload } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import {
  getChapterPlaybackUrl,
  getCourseById,
  getCourseChapters,
  getCourseProgress,
  saveCourseProgress,
} from '@/services/dataService'
import type { CourseChapter, CourseDetail } from '@/types'
import styles from './content.module.scss'

const VIDEO_ID = 'course-chapter-video'
const RENEW_BEFORE_EXPIRY_MS = 30 * 1000

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export default function CourseContentPage() {
  const [courseId, setCourseId] = useState('')
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [chapters, setChapters] = useState<CourseChapter[]>([])
  const [currentChapter, setCurrentChapter] = useState<CourseChapter | null>(null)
  const [playbackUrl, setPlaybackUrl] = useState('')
  const [expiresAt, setExpiresAt] = useState(0)
  const [loading, setLoading] = useState(true)
  const [playerLoading, setPlayerLoading] = useState(false)
  const [error, setError] = useState('')
  const videoTimeRef = useRef(0)
  const renewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingRef = useRef(false)

  const persistProgress = useCallback(async (completed = false) => {
    const id = Number(courseId)
    if (!Number.isFinite(id) || !currentChapter || savingRef.current) return
    savingRef.current = true
    try {
      await saveCourseProgress(id, currentChapter.id, videoTimeRef.current, completed)
    } finally {
      savingRef.current = false
    }
  }, [courseId, currentChapter])

  const loadPlayback = useCallback(async (chapter: CourseChapter) => {
    const id = Number(courseId)
    if (!Number.isFinite(id) || !chapter.can_play) return
    setPlayerLoading(true)
    try {
      const playback = await getChapterPlaybackUrl(id, chapter.id)
      setPlaybackUrl(playback.url)
      setExpiresAt(playback.expires_at)
      videoTimeRef.current = 0
      const delay = Math.max(
        30_000,
        playback.expires_at * 1000 - Date.now() - RENEW_BEFORE_EXPIRY_MS,
      )
      renewTimerRef.current = setTimeout(() => { void loadPlayback(chapter) }, delay)
    } catch {
      setPlaybackUrl('')
      Taro.showToast({ title: '播放地址已过期，请重新进入', icon: 'none' })
    } finally {
      setPlayerLoading(false)
    }
  }, [courseId])

  useLoad(options => { setCourseId(options?.id || '') })

  useEffect(() => {
    if (!courseId) {
      setLoading(false)
      return
    }
    const id = Number(courseId)
    if (!Number.isFinite(id)) {
      setError(STRINGS.COURSE_NOT_FOUND)
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    void (async () => {
      try {
        const [detail, chapterResult, progress] = await Promise.all([
          getCourseById(id),
          getCourseChapters(id),
          getCourseProgress(id).catch(() => null),
        ])
        if (!detail || !chapterResult) {
          setError(STRINGS.COURSE_NOT_FOUND)
          return
        }
        setCourse(detail)
        setChapters(chapterResult.chapters)
        const playable = chapterResult.chapters.filter(item => item.can_play)
        const initial =
          playable.find(item => item.id === progress?.last_chapter_id) ??
          playable[0] ??
          null
        setCurrentChapter(initial)
        if (initial) await loadPlayback(initial)
      } catch {
        setError(STRINGS.COURSE_LOAD_ERROR)
      } finally {
        setLoading(false)
      }
    })()
  }, [courseId, loadPlayback])

  useEffect(() => () => {
    if (renewTimerRef.current) clearTimeout(renewTimerRef.current)
  }, [])

  useUnload(() => { void persistProgress() })

  const switchChapter = async (chapter: CourseChapter) => {
    if (!chapter.can_play) {
      Taro.showToast({ title: '购买后解锁该章节', icon: 'none' })
      return
    }
    await persistProgress()
    if (renewTimerRef.current) clearTimeout(renewTimerRef.current)
    setCurrentChapter(chapter)
    await loadPlayback(chapter)
  }

  if (loading) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.COURSE_CONTENT_TITLE} shouldShowBack />
          <View className={styles.empty}><Text>加载中...</Text></View>
        </View>
      </AuthGuard>
    )
  }

  if (error || !course) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={STRINGS.COURSE_CONTENT_TITLE} shouldShowBack />
          <View className={styles.empty}><Text>{error || STRINGS.COURSE_NOT_FOUND}</Text></View>
        </View>
      </AuthGuard>
    )
  }

  if (chapters.length === 0 || !currentChapter) {
    return (
      <AuthGuard>
        <View className={styles.page}>
          <PageHeader title={course.title} shouldShowBack />
          <View className={styles.empty}>
            <Text className={styles.lockText}>{STRINGS.COURSE_CONTENT_LOCKED}</Text>
            <Button
              variant='gradient'
              size='md'
              onClick={() => Taro.navigateTo({ url: `/${ROUTES.COURSE_DETAIL}?id=${course.id}` })}
            >
              {STRINGS.COURSE_BUY_BTN}
            </Button>
          </View>
        </View>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={course.title} shouldShowBack />
        <View className={styles.viewerWrap}>
          {playerLoading || !playbackUrl ? (
            <View className={styles.viewerPlaceholder}><Text>视频加载中...</Text></View>
          ) : (
            <Video
              key={playbackUrl}
              id={VIDEO_ID}
              className={styles.video}
              src={playbackUrl}
              controls
              autoplay={false}
              objectFit='contain'
              initialTime={0}
              onTimeUpdate={event => { videoTimeRef.current = event.detail.currentTime }}
              onPause={() => { void persistProgress() }}
              onEnded={() => { void persistProgress(true) }}
              onError={() => Taro.showToast({ title: '当前视频格式暂不支持播放', icon: 'none' })}
            />
          )}
        </View>
        <ScrollView className={styles.body} scrollY>
          {!course.has_access && course.price > 0 && (
            <View className={styles.previewNotice}>
              <Text>前 {course.preview_chapter_count} 集可试看，购买后解锁全部课程</Text>
            </View>
          )}
          <Text className={styles.sectionTitle}>{STRINGS.COURSE_CONTENT_CHAPTERS}</Text>
          {chapters.map((chapter, index) => (
            <View
              key={chapter.id}
              className={`${styles.assetItem} ${currentChapter?.id === chapter.id ? styles.assetActive : ''}`}
              onClick={() => { void switchChapter(chapter) }}
            >
              <View className={styles.assetIndex}>{index + 1}</View>
              <Icon name='play-circle' size={20} color={currentChapter?.id === chapter.id ? '#1677FF' : '#666'} />
              <Text className={styles.assetTitle}>{chapter.title}</Text>
              <Text className={styles.previewTag}>{formatDuration(chapter.duration)}</Text>
              {!chapter.can_play && <Text className={styles.lockText}>锁定</Text>}
              {chapter.is_preview && chapter.can_play && <Text className={styles.previewTag}>试看</Text>}
            </View>
          ))}
          <View style={{ height: '24rpx' }} />
          <Text style={{ fontSize: '22rpx', color: '#999' }}>
            播放地址有效期至 {new Date(expiresAt * 1000).toLocaleTimeString()}，到期会自动续期
          </Text>
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
