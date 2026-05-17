import type { ReactNode } from 'react'
import { View, Text } from '@tarojs/components'
import { Icon } from '@/components/Icon'
import styles from './index.module.scss'

interface EmptyStateProps {
  icon?: string
  iconNode?: ReactNode
  title: string
  description?: string
  children?: ReactNode
}

export function EmptyState({ icon, iconNode, title, description, children }: EmptyStateProps) {
  return (
    <View className={styles.wrapper}>
      {iconNode || (icon && <Icon name={icon} size={96} color='#BFBFBF' className={styles.icon} />)}
      <Text className={styles.title}>{title}</Text>
      {description && <Text className={styles.desc}>{description}</Text>}
      {children && <View className={styles.actions}>{children}</View>}
    </View>
  )
}
