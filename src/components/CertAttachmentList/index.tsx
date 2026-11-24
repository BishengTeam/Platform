import { useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { CertAttachmentItem } from '@/services/certificationJourney'
import { resolveUrl } from '@/utils/request'
import { PressableLink } from '../PressableLink'
import styles from './index.module.scss'

interface Props {
  attachments: CertAttachmentItem[]
  loading?: boolean
  error?: string
  onRetry?: () => void
  compact?: boolean
}

/**
 * 微信 openDocument 支持的 fileType 白名单。
 * downloadFile 的临时路径没有可靠后缀，不显式传 fileType 时 doc/docx/xls 等会打开失败
 * （表现为「文件已损坏」）。txt 不在 openDocument 支持范围内，只能复制链接。
 */
const OPENABLE: Record<string, 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'ppt' | 'pptx'> = {
  pdf: 'pdf', doc: 'doc', docx: 'docx', xls: 'xls', xlsx: 'xlsx', ppt: 'ppt', pptx: 'pptx',
}

function extensionOf(url: string) {
  return (url.split('?')[0].split('.').pop() || '').toLowerCase()
}

function typeLabel(ext: string) {
  if (ext === 'pdf') return 'PDF'
  if (['doc', 'docx'].includes(ext)) return 'DOC'
  if (['xls', 'xlsx'].includes(ext)) return 'XLS'
  return 'FILE'
}

function formatSize(size: number | null) {
  if (!size) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

export function CertAttachmentList({ attachments, loading, error, onRetry, compact }: Props) {
  const [downloading, setDownloading] = useState(0)
  if (!loading && !error && attachments.length === 0) return null
  return <View className={compact ? styles.compact : styles.card}>
    <Text className={styles.title}>配套附件{attachments.length ? `（${attachments.length}）` : ''}</Text>
    {loading && <View className={styles.skeleton}><View /><View /></View>}
    {!loading && error && <View className={styles.errorRow}>
      <Text className={styles.error}>{error}</Text>
      {onRetry && <PressableLink onClick={onRetry} ariaLabel='重试加载附件'>重试</PressableLink>}
    </View>}
    {!loading && !error && attachments.map(item => {
      const ext = extensionOf(item.file_url)
      const fileType = OPENABLE[ext]
      const openable = Boolean(fileType)
      return <View
        key={item.id}
        className={styles.row}
        aria-role='button'
        aria-label={`下载附件 ${item.title}`}
        onClick={() => {
          if (downloading) return
          setDownloading(item.id)
          const url = resolveUrl(item.file_url)
          if (!fileType) {
            void Taro.setClipboardData({ data: url })
              .then(() => Taro.showToast({ title: '下载链接已复制，请在浏览器打开', icon: 'none' }))
              .finally(() => setDownloading(0))
            return
          }
          void Taro.downloadFile({ url })
            .then(async result => {
              // downloadFile 遇到 404/500 也会 resolve，必须自己看 statusCode，否则会把错误页当附件打开。
              if (result.statusCode !== 200 || !result.tempFilePath) {
                Taro.showToast({ title: '附件下载失败，请稍后重试', icon: 'none' })
                return
              }
              try {
                await Taro.openDocument({ filePath: result.tempFilePath, fileType, showMenu: true })
              } catch {
                Taro.showToast({ title: '文件无法打开，请联系管理员确认附件内容', icon: 'none' })
              }
            })
            .catch(() => Taro.showToast({ title: '附件下载失败，请稍后重试', icon: 'none' }))
            .finally(() => setDownloading(0))
        }}
      >
        <View className={`${styles.icon} ${styles[`icon_${ext}`] || ''}`}>{typeLabel(ext)}</View>
        <View className={styles.info}>
          <Text className={styles.name}>{item.title}</Text>
          <Text className={styles.meta}>{formatSize(item.file_size)}{item.file_size ? ' · ' : ''}点击下载</Text>
        </View>
        <Text className={styles.action}>{downloading === item.id ? '下载中…' : openable ? '下载' : '复制链接'}</Text>
      </View>
    })}
  </View>
}
