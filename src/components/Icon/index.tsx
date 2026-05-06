import { useMemo } from 'react'
import { Image } from '@tarojs/components'
import { ICON_SVG_MAP } from '@/constants/icons'
import { toBase64 } from '@/utils/base64'
import styles from './index.module.scss'

interface IconProps {
  name: string
  size?: number
  color?: string
  className?: string
}

export function Icon({ name, size = 28, color = '#999', className = '' }: IconProps) {
  const svg = ICON_SVG_MAP[name]

  const src = useMemo(() => {
    if (!svg) return ''
    const coloredSvg = svg.replace(/currentColor/g, color)
    return `data:image/svg+xml;base64,${toBase64(coloredSvg)}`
  }, [svg, color])

  if (!svg) return null

  return (
    <Image
      className={`${styles.icon} ${className}`}
      src={src}
      mode='aspectFit'
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    />
  )
}
