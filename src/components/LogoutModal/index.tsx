import { View, Text } from '@tarojs/components'
import styles from './index.module.scss'

interface LogoutModalProps {
  visible: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function LogoutModal({ visible, onCancel, onConfirm }: LogoutModalProps) {
  if (!visible) return null

  return (
    <View className={styles.overlay}>
      <View className={styles.box}>
        <Text className={styles.title}>提示</Text>
        <Text className={styles.content}>确定要退出当前账号吗？</Text>
        <View className={styles.buttons}>
          <View className={styles.cancelBtn} onClick={onCancel}>
            <Text className={styles.cancelBtnText}>取消</Text>
          </View>
          <View className={styles.confirmBtn} onClick={onConfirm}>
            <Text className={styles.confirmBtnText}>退出</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
