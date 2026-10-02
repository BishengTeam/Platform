import { useCallback, useRef, useState } from 'react'
import { Image, ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { PageHeader } from '@/components/PageHeader'
import { STRINGS } from '@/constants/strings'
import { createTicket, uploadFile } from '@/services/dataService'
import styles from './feedback.module.scss'

// 协议值与 Admin 工单解析保持同源：content 中的「类型：」必须使用这些原文。
const FEEDBACK_TYPES = ['功能异常', '产品建议', '内容问题', '其他'] as const
type FeedbackType = (typeof FEEDBACK_TYPES)[number]

const MAX_IMAGES = 3
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
const MIN_DESCRIPTION_LENGTH = 5
const MAX_DESCRIPTION_LENGTH = 500

interface FeedbackImage {
  key: string
  localPath: string
  url: string
  status: 'uploading' | 'uploaded' | 'failed'
}

function uploadErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : '上传失败，请重试'
}

function submitErrorMessage(error: unknown): string {
  return error instanceof Error && error.message && error.message !== 'UNAUTHORIZED'
    ? error.message
    : '操作失败，请稍后重试'
}

/**
 * 意见反馈 — 复用客服工单（POST /api/tickets）的通用反馈页。
 *
 * content 协议与练习页【题目反馈】平级，Admin 端按协议解析：
 *   【意见反馈】
 *   类型：功能异常
 *   说明：…
 *   图片：/api/media/xxx,/api/media/yyy（无图时省略整行）
 */
export default function FeedbackPage() {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('功能异常')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<FeedbackImage[]>([])
  const [submitting, setSubmitting] = useState(false)
  const imageKeySeq = useRef(0)

  const uploadImage = useCallback(async (key: string, localPath: string) => {
    setImages(current => current.map(item => (
      item.key === key ? { ...item, status: 'uploading' as const } : item
    )))
    try {
      const { url } = await uploadFile(localPath)
      setImages(current => current.map(item => (
        item.key === key ? { ...item, status: 'uploaded' as const, url } : item
      )))
    } catch {
      setImages(current => current.map(item => (
        item.key === key ? { ...item, status: 'failed' as const } : item
      )))
    }
  }, [])

  const chooseImages = useCallback(async () => {
    const remaining = MAX_IMAGES - images.length
    if (remaining <= 0 || submitting) return
    try {
      const result = await Taro.chooseMedia({
        count: remaining,
        mediaType: ['image'],
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
      })
      const files = (result.tempFiles || []).filter(file => file.tempFilePath)
      const validFiles = files.filter(file => (file.size || 0) <= MAX_IMAGE_SIZE_BYTES)
      if (validFiles.length < files.length) {
        Taro.showToast({ title: STRINGS.FEEDBACK_IMAGE_TOO_LARGE, icon: 'none', duration: 2000 })
      }
      if (validFiles.length === 0) return

      const added = validFiles.slice(0, remaining).map(file => ({
        key: `feedback-image-${++imageKeySeq.current}`,
        localPath: file.tempFilePath,
        url: '',
        status: 'uploading' as const,
      }))
      setImages(current => [...current, ...added])
      // 串行上传，弱网下避免同时打满请求；每张图状态独立可重试。
      for (const item of added) {
        await uploadImage(item.key, item.localPath)
      }
    } catch {
      // 用户取消选择，静默返回
    }
  }, [images.length, submitting, uploadImage])

  const retryImage = useCallback((key: string) => {
    const target = images.find(item => item.key === key)
    if (!target || target.status === 'uploading') return
    void uploadImage(key, target.localPath)
  }, [images, uploadImage])

  const removeImage = useCallback((key: string) => {
    setImages(current => current.filter(item => item.key !== key))
  }, [])

  const previewImage = useCallback((current: FeedbackImage) => {
    if (current.status === 'failed') return
    Taro.previewImage({
      current: current.localPath,
      urls: images.filter(item => item.status !== 'failed').map(item => item.localPath),
    })
  }, [images])

  const goBack = useCallback(() => {
    const pages = Taro.getCurrentPages()
    if (pages.length > 1) {
      Taro.navigateBack()
    } else {
      Taro.switchTab({ url: '/pages/index/index' })
    }
  }, [])

  const handleSubmit = useCallback(async () => {
    if (submitting) return
    const text = description.trim()
    if (text.length < MIN_DESCRIPTION_LENGTH || text.length > MAX_DESCRIPTION_LENGTH) {
      Taro.showToast({ title: STRINGS.FEEDBACK_DESCRIPTION_HINT, icon: 'none', duration: 2000 })
      return
    }
    if (images.some(item => item.status === 'uploading')) {
      Taro.showToast({ title: STRINGS.FEEDBACK_IMAGE_WAITING, icon: 'none', duration: 2000 })
      return
    }
    if (images.some(item => item.status === 'failed')) {
      Taro.showToast({ title: STRINGS.FEEDBACK_IMAGE_HAS_FAILED, icon: 'none', duration: 2000 })
      return
    }

    const lines = [
      '【意见反馈】',
      `类型：${feedbackType}`,
      `说明：${text}`,
    ]
    const uploadedUrls = images
      .filter(item => item.status === 'uploaded' && item.url)
      .map(item => item.url)
    if (uploadedUrls.length > 0) lines.push(`图片：${uploadedUrls.join(',')}`)

    setSubmitting(true)
    try {
      await createTicket({ content: lines.join('\n') })
      Taro.showToast({ title: STRINGS.FEEDBACK_SUBMITTED, icon: 'success', duration: 2000 })
      goBack()
    } catch (error) {
      Taro.showToast({ title: `提交失败：${submitErrorMessage(error)}`, icon: 'none', duration: 2500 })
    } finally {
      setSubmitting(false)
    }
  }, [description, feedbackType, goBack, images, submitting])

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.MINE_FEEDBACK_TITLE} shouldShowBack />
        <ScrollView className={styles.body} scrollY>
          <View className={styles.bodyInner}>
            <View className={styles.card}>
              <View className={styles.section}>
                <Text className={styles.sectionLabel}>{STRINGS.FEEDBACK_TYPE_LABEL}</Text>
                <View className={styles.typeGrid}>
                  {FEEDBACK_TYPES.map(type => (
                    <Text
                      key={type}
                      className={type === feedbackType ? `${styles.typeChip} ${styles.typeChipActive}` : styles.typeChip}
                      onClick={() => setFeedbackType(type)}
                    >
                      {type}
                    </Text>
                  ))}
                </View>
              </View>

              <View className={styles.section}>
                <View className={styles.sectionHead}>
                  <Text className={styles.sectionLabel}>{STRINGS.FEEDBACK_DESCRIPTION_LABEL}</Text>
                  <Text className={styles.counter}>{description.trim().length}/{MAX_DESCRIPTION_LENGTH}</Text>
                </View>
                <Textarea
                  className={styles.textarea}
                  value={description}
                  maxlength={MAX_DESCRIPTION_LENGTH}
                  placeholder={STRINGS.FEEDBACK_DESCRIPTION_PLACEHOLDER}
                  placeholderClass={styles.textareaPlaceholder}
                  disabled={submitting}
                  onInput={event => setDescription(event.detail.value)}
                />
              </View>

              <View className={styles.sectionLast}>
                <View className={styles.sectionHead}>
                  <Text className={styles.sectionLabel}>{STRINGS.FEEDBACK_IMAGES_LABEL}</Text>
                  <Text className={styles.counter}>{images.length}/{MAX_IMAGES}</Text>
                </View>
                <View className={styles.imageGrid}>
                  {images.map(item => (
                    <View
                      key={item.key}
                      className={styles.imageTile}
                      onClick={() => previewImage(item)}
                    >
                      <Image className={styles.imageThumb} src={item.localPath} mode='aspectFill' />
                      {item.status !== 'uploaded' && (
                        <View
                          className={styles.imageMask}
                          onClick={event => {
                            event.stopPropagation()
                            if (item.status === 'failed') retryImage(item.key)
                          }}
                        >
                          <Text className={styles.imageMaskText}>
                            {item.status === 'uploading' ? STRINGS.FEEDBACK_IMAGE_UPLOADING : STRINGS.FEEDBACK_IMAGE_RETRY}
                          </Text>
                        </View>
                      )}
                      <View
                        className={styles.imageRemove}
                        onClick={event => {
                          event.stopPropagation()
                          removeImage(item.key)
                        }}
                      >
                        <Icon name='close' size={20} color='#FFFFFF' />
                      </View>
                    </View>
                  ))}
                  {images.length < MAX_IMAGES && (
                    <View className={styles.imageAdd} onClick={() => void chooseImages()}>
                      <Icon name='plus' size={32} color='#999999' />
                      <Text className={styles.imageAddText}>{STRINGS.FEEDBACK_IMAGE_ADD}</Text>
                    </View>
                  )}
                </View>
                <Text className={styles.limitHint}>{STRINGS.FEEDBACK_IMAGE_LIMIT_HINT}</Text>
              </View>
            </View>

            <View className={styles.btnSection}>
              <Button
                size='lg'
                loading={submitting}
                disabled={submitting}
                onClick={() => void handleSubmit()}
              >
                {STRINGS.FEEDBACK_SUBMIT}
              </Button>
            </View>
          </View>
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
