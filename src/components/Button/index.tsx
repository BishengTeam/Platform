import { Button as NutButton } from '@nutui/nutui-react-taro'
import type { ReactNode } from 'react'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'gradient'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  disabled?: boolean
  onClick?: () => void
  children: ReactNode
  style?: Record<string, string>
  color?: string
}

const SIZE_MAP: Record<string, 'small' | 'normal' | 'large'> = {
  sm: 'small',
  md: 'normal',
  lg: 'large',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  onClick,
  children,
  style,
  color,
}: ButtonProps) {
  if (variant === 'gradient') {
    return (
      <NutButton
        className={className}
        size={SIZE_MAP[size] || 'normal'}
        color={color || 'linear-gradient(135deg, #1677FF, #4096FF)'}
        disabled={disabled}
        onClick={onClick}
        style={style}
      >
        {children}
      </NutButton>
    )
  }

  return (
    <NutButton
      className={className}
      type={variant === 'primary' ? 'primary' : 'default'}
      size={SIZE_MAP[size] || 'normal'}
      disabled={disabled}
      onClick={onClick}
      style={style}
      color={color}
    >
      {children}
    </NutButton>
  )
}
