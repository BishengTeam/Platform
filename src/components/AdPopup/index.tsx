import { View, Text, Image } from '@tarojs/components'
import { navigateToUrl } from '@/utils/navigation'
import { STRINGS } from '@/constants/strings'
import styles from './index.module.scss'

interface AdPopupProps {
  visible: boolean
  /** 已解析为完整 URL 的海报图（1280×1080） */
  imageUrl: string
  /** 站内跳转路径，空则点击图片仅关闭 */
  jumpLink?: string | null
  onClose: () => void
  /** 用户选择「今日不再弹出」 */
  onDismissToday: () => void
}

export function AdPopup({ visible, imageUrl, jumpLink, onClose, onDismissToday }: AdPopupProps) {
  if (!visible || !imageUrl) return null

  return (
    <View className={styles.overlay} onClick={onClose}>
      <View className={styles.content} onClick={e => e.stopPropagation()}>
        <View className={styles.poster}>
          <Image
            className={styles.posterImage}
            src={imageUrl}
            mode='widthFix'
            onClick={() => {
              if (jumpLink) navigateToUrl(jumpLink)
              onClose()
            }}
          />
        </View>
        <View className={styles.closeBtn} onClick={onClose}>
          <Text className={styles.closeIcon}>×</Text>
        </View>
        <View className={styles.dismissBtn} onClick={onDismissToday}>
          <Text className={styles.dismissText}>{STRINGS.AD_POPUP_DISMISS_TODAY}</Text>
        </View>
      </View>
    </View>
  )
}
