import { type ReactNode } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Icon } from '@/components/Icon'
import styles from './index.module.scss'

interface PageHeaderProps {
  title: string
  shouldShowBack?: boolean
  onBack?: () => void
  rightContent?: ReactNode
}

export function PageHeader({ title, shouldShowBack = false, onBack, rightContent }: PageHeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      Taro.navigateBack()
    }
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
