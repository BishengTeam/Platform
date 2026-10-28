import { Button as NutButton } from '@nutui/nutui-react-taro'
import type { ReactNode } from 'react'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'gradient'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  disabled?: boolean
  loading?: boolean
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
  loading,
  onClick,
  children,
  style,
  color,
}: ButtonProps) {
  if (variant === 'gradient') {
    // NutUI 禁用态会给文字内层挂 nut-button-default-disabled 灰底,而渐变背景是内联样式盖不掉类样式,
    // 会变成蓝底中间一块灰;禁用/加载时整体盖成统一禁用灰
    const inactive = disabled || loading
    return (
      <NutButton
        className={className}
        size={SIZE_MAP[size] || 'normal'}
        color={color || 'linear-gradient(135deg, #1677FF, #4096FF)'}
        disabled={disabled}
        loading={loading}
        onClick={onClick}
        style={inactive ? { background: '#C2C4CC', borderColor: 'transparent', ...style } : style}
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
      loading={loading}
      onClick={onClick}
      style={style}
      color={color}
    >
      {children}
    </NutButton>
  )
}
