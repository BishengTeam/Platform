import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, ScrollView, Video, Audio, Image } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import { getCourseAssetPlaybackUrl, getCourseContent } from '@/services/dataService'
import { ApiError } from '@/utils/request'
import type { CourseAsset, CourseContent as CourseContentType } from '@/types'
import styles from './content.module.scss'

const VIDEO_ID = 'course-resource-video'
const RENEW_EARLY_MS = 5 * 60 * 1000
const RENEW_RETRY_MS = 30 * 1000

type AssetKind = 'video' | 'audio' | 'image' | 'document'

function getAssetKind(asset: CourseAsset): AssetKind {
  const type = asset.asset_type.toLowerCase()
  if (type.includes('video')) return 'video'
  if (type.includes('audio')) return 'audio'
  if (type.includes('image')) return 'image'
  return 'document'
}

function getAssetIcon(asset: CourseAsset): string {
  switch (getAssetKind(asset)) {
    case 'video': return 'play-circle'
    case 'audio': return 'headphones'
    case 'image': return 'image'
    default: return 'file-text'
  }
}

export default function CourseContentPage() {
  const [courseId, setCourseId] = useState('')
  const [content, setContent] = useState<CourseContentType | null>(null)
  const [currentAsset, setCurrentAsset] = useState<CourseAsset | null>(null)
  const [playbackUrl, setPlaybackUrl] = useState('')
  const [playbackExpiresAt, setPlaybackExpiresAt] = useState(0)
  const [assetLoading, setAssetLoading] = useState(false)
  const [openingDocument, setOpeningDocument] = useState(false)
  const [accessLost, setAccessLost] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const currentTimeRef = useRef(0)
  const resumeTimeRef = useRef(0)
  const wasPlayingRef = useRef(false)
  const resumePlayingRef = useRef(false)
  const playbackRequestRef = useRef(0)

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
          setCurrentAsset(data.assets?.[0] || null)
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

  const loadPlaybackUrl = useCallback(async (asset: CourseAsset, renewing = false) => {
    const requestId = ++playbackRequestRef.current
    if (renewing) {
      resumeTimeRef.current = currentTimeRef.current
      resumePlayingRef.current = wasPlayingRef.current
    } else {
      currentTimeRef.current = 0
      resumeTimeRef.current = 0
      resumePlayingRef.current = false
      setAssetLoading(true)
    }

    try {
      const playback = await getCourseAssetPlaybackUrl(asset.id)
      if (requestId !== playbackRequestRef.current) return
      setPlaybackUrl(playback.url)
      setPlaybackExpiresAt(playback.expires_at)
      setAccessLost(false)
    } catch (err) {
      if (requestId !== playbackRequestRef.current) return
      if (err instanceof ApiError && err.code === 40101) {
        setAccessLost(true)
        setPlaybackUrl('')
      } else {
        Taro.showToast({ title: '课程资源加载失败，请稍后重试', icon: 'none' })
        if (renewing) {
          const retryExpiry = Date.now() + RENEW_EARLY_MS + RENEW_RETRY_MS
          setPlaybackExpiresAt(Math.floor(retryExpiry / 1000))
        }
      }
    } finally {
      if (requestId === playbackRequestRef.current) {
        setAssetLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    playbackRequestRef.current += 1
    setPlaybackUrl('')
    setPlaybackExpiresAt(0)
    if (currentAsset) {
      void loadPlaybackUrl(currentAsset)
    }
  }, [currentAsset, loadPlaybackUrl])

  useEffect(() => {
    if (!currentAsset || !playbackExpiresAt) return
    const renewAt = playbackExpiresAt * 1000 - RENEW_EARLY_MS
    const delay = Math.max(renewAt - Date.now(), 1000)
    const timer = setTimeout(() => {
      void loadPlaybackUrl(currentAsset, true)
    }, delay)
    return () => clearTimeout(timer)
  }, [currentAsset, playbackExpiresAt, loadPlaybackUrl])

  const handleBuy = () => {
    if (!courseId) return
    Taro.navigateTo({ url: `/${ROUTES.COURSE_DETAIL}?id=${courseId}` })
  }

  const handleVideoReady = () => {
    if (resumeTimeRef.current <= 0) return
    const video = Taro.createVideoContext(VIDEO_ID)
    video.seek(resumeTimeRef.current)
    if (resumePlayingRef.current) {
      setTimeout(() => video.play(), 100)
    }
    resumeTimeRef.current = 0
    resumePlayingRef.current = false
  }

  const handleOpenDocument = async () => {
    if (!currentAsset || !playbackUrl || openingDocument) return
    setOpeningDocument(true)
    Taro.showLoading({ title: '正在打开...', mask: true })
    try {
      const result = await Taro.downloadFile({ url: playbackUrl })
      if (result.statusCode < 200 || result.statusCode >= 300) {
        throw new Error('文件下载失败')
      }
      await Taro.openDocument({
        filePath: result.tempFilePath,
        showMenu: true,
      })
    } catch (err) {
      Taro.showToast({ title: '暂时无法打开该资料', icon: 'none' })
    } finally {
      Taro.hideLoading()
      setOpeningDocument(false)
    }
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

  if (accessLost || (!content.learning_access && content.assets.length === 0)) {
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

  const currentKind = currentAsset ? getAssetKind(currentAsset) : null

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={content.title || STRINGS.COURSE_CONTENT_TITLE} shouldShowBack />
        <View className={styles.viewerWrap}>
          {assetLoading ? (
            <View className={styles.viewerPlaceholder}>
              <Text>资源加载中...</Text>
            </View>
          ) : currentAsset && playbackUrl && currentKind === 'video' ? (
            <Video
              key={playbackUrl}
              id={VIDEO_ID}
              className={styles.video}
              src={playbackUrl}
              controls
              autoplay={false}
              objectFit='contain'
              onPlay={() => { wasPlayingRef.current = true }}
              onPause={() => { wasPlayingRef.current = false }}
              onTimeUpdate={(event) => { currentTimeRef.current = event.detail.currentTime }}
              onLoadedMetaData={handleVideoReady}
            />
          ) : currentAsset && playbackUrl && currentKind === 'audio' ? (
            <View className={styles.audioWrap}>
              <Icon name='headphones' size={48} color='#1677FF' />
              <Audio
                key={playbackUrl}
                className={styles.audio}
                src={playbackUrl}
                controls
                name={currentAsset.title}
                author={content.title}
                onPlay={() => { wasPlayingRef.current = true }}
                onPause={() => { wasPlayingRef.current = false }}
                onTimeUpdate={(event) => { currentTimeRef.current = event.detail.currentTime }}
              />
            </View>
          ) : currentAsset && playbackUrl && currentKind === 'image' ? (
            <Image className={styles.previewImage} src={playbackUrl} mode='aspectFit' />
          ) : currentAsset && playbackUrl ? (
            <View className={styles.documentWrap}>
              <Icon name='file-text' size={48} color='#1677FF' />
              <Text className={styles.documentTitle}>{currentAsset.title}</Text>
              <Button variant='gradient' size='md' loading={openingDocument} onClick={handleOpenDocument}>
                打开资料
              </Button>
            </View>
          ) : (
            <View className={styles.viewerPlaceholder}>
              <Text>{currentAsset ? '课程资源暂不可用' : '暂无课程资源'}</Text>
            </View>
          )}
        </View>

        <ScrollView className={styles.body} scrollY>
          {!content.learning_access && content.assets.length > 0 && (
            <View className={styles.previewNotice}>
              <Text>当前展示课程试看资源</Text>
            </View>
          )}
          <Text className={styles.sectionTitle}>{STRINGS.COURSE_CONTENT_CHAPTERS}</Text>
          {content.assets.map((asset, index) => (
            <View
              key={asset.id}
              className={`${styles.assetItem} ${
                currentAsset?.id === asset.id ? styles.assetActive : ''
              }`}
              onClick={() => setCurrentAsset(asset)}
            >
              <View className={styles.assetIndex}>{index + 1}</View>
              <Icon name={getAssetIcon(asset)} size={20} color={currentAsset?.id === asset.id ? '#1677FF' : '#666'} />
              <Text className={styles.assetTitle}>{asset.title}</Text>
              {asset.is_preview && <Text className={styles.previewTag}>试看</Text>}
            </View>
          ))}
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
