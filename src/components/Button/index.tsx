import { View } from '@tarojs/components'
import type { ReactNode } from 'react'
import styles from './index.module.scss'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'gradient'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick?: () => void
  children: ReactNode
  style?: Record<string, string>
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
  children,
  style,
}: ButtonProps) {
  const cls = `${styles.base} ${styles[variant] || styles.primary} ${styles[size] || styles.md} ${className}`

  return (
    <View className={cls} onClick={onClick} style={style}>
      {children}
    </View>
  )
}
