import { useEffect, useState } from 'react'
import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { resolveMediaUrl } from '@/utils/media'
import styles from './index.module.scss'

export interface ConsultationGroupInfo {
  qrcode_url: string
  join_instructions?: string | null
  expires_at?: string | null
  contact_name?: string | null
  contact_phone?: string | null
}

interface ConsultationGroupCardProps {
  group: ConsultationGroupInfo
}

export function ConsultationGroupCard({ group }: ConsultationGroupCardProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const qrcodeUrl = resolveMediaUrl(group.qrcode_url)

  useEffect(() => {
    setImageFailed(false)
  }, [qrcodeUrl])

  const preview = async () => {
    if (imageFailed) return
    try {
      await Taro.previewImage({ urls: [qrcodeUrl] })
    } catch {
      Taro.showToast({ title: '二维码预览失败', icon: 'none' })
    }
  }

  const copyPhone = async () => {
    if (!group.contact_phone) return
    try {
      await Taro.setClipboardData({ data: group.contact_phone })
    } catch {
      Taro.showToast({ title: '复制失败，请手动记录', icon: 'none' })
    }
  }

  return (
    <View className={styles.card}>
      <Text className={styles.title}>批次咨询群</Text>
      {group.join_instructions && (
        <Text className={styles.instructions}>{group.join_instructions}</Text>
      )}
      <View className={styles.qrcodeWrap} onClick={() => { void preview() }}>
        {imageFailed ? (
          <Text className={styles.empty}>二维码暂时无法显示</Text>
        ) : (
          <Image
            className={styles.qrcode}
            src={qrcodeUrl}
            mode='aspectFit'
            onError={() => setImageFailed(true)}
          />
        )}
      </View>
      <Text className={styles.hint}>点击二维码可放大，长按识别加入咨询群</Text>
      {Boolean(group.contact_name || group.contact_phone) && (
        <View className={styles.contactRow}>
          <Text className={styles.contactLabel}>联系人</Text>
          <Text className={styles.contactValue}>
            {group.contact_name || '-'}
            {group.contact_phone ? ` · ${group.contact_phone}` : ''}
          </Text>
          {group.contact_phone && (
            <View className={styles.copyBtn} onClick={() => { void copyPhone() }}>
              <Text className={styles.copyText}>复制</Text>
            </View>
          )}
        </View>
      )}
    </View>
  )
}
