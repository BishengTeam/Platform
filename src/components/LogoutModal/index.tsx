import { View, Text } from '@tarojs/components'
import { STRINGS } from '@/constants/strings'
import styles from './index.module.scss'

interface LogoutModalProps {
  isVisible: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function LogoutModal({ isVisible, onCancel, onConfirm }: LogoutModalProps) {
  if (!isVisible) return null

  return (
    <View className={styles.overlay}>
      <View className={styles.box}>
        <Text className={styles.title}>{STRINGS.LOGOUT_MODAL_TITLE}</Text>
        <Text className={styles.content}>{STRINGS.LOGOUT_MODAL_CONTENT}</Text>
        <View className={styles.buttons}>
          <View className={styles.cancelBtn} onClick={onCancel}>
            <Text className={styles.cancelBtnText}>{STRINGS.LOGOUT_MODAL_CANCEL}</Text>
          </View>
          <View className={styles.confirmBtn} onClick={onConfirm}>
            <Text className={styles.confirmBtnText}>{STRINGS.LOGOUT_MODAL_CONFIRM}</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
