import { View } from '@tarojs/components'
import type { ReactNode } from 'react'
import styles from './index.module.scss'

interface Props {
  children: ReactNode
  onClick?: () => void
  ariaLabel?: string
  disabled?: boolean
  className?: string
}

/** 文本型按钮：至少 44px 触控高度、按钮语义与按压反馈。 */
export function PressableLink({ children, onClick, ariaLabel, disabled = false, className }: Props) {
  return (
    <View
      className={`${styles.link} ${disabled ? styles.disabled : ''} ${className ?? ''}`}
      aria-role='button'
      aria-label={ariaLabel}
      aria-disabled={disabled}
      onClick={() => { if (!disabled) onClick?.() }}
    >
      {children}
    </View>
  )
}
