import type { ReactNode } from 'react'
import { View, Text } from '@tarojs/components'
import { Icon } from '@/components/Icon'
import { safeNavigateBack } from '@/utils/navigation'
import styles from './index.module.scss'

interface PageHeaderProps {
  title: string
  shouldShowBack?: boolean
  onBack?: () => void
  fallbackUrl?: string
  rightContent?: ReactNode
}

export function PageHeader({
  title,
  shouldShowBack = false,
  onBack,
  fallbackUrl,
  rightContent,
}: PageHeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack()
      return
    }
    void safeNavigateBack({ fallbackUrl })
  }

  return (
    <View className={styles.nav}>
      <View className={styles.side}>
        {shouldShowBack && (
          <View className={styles.backBtn} onClick={handleBack}>
            <Icon name='chevron-left' size={20} color='#333333' />
          </View>
        )}
      </View>
      <Text className={styles.title}>{title}</Text>
      <View className={styles.side}>
        {rightContent}
      </View>
    </View>
  )
}
