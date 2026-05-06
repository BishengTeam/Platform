import { useState } from 'react'
import { View, Image } from '@tarojs/components'
import styles from './index.module.scss'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

interface ImageWithFallbackProps {
  src: string
  className?: string
  style?: Record<string, string>
  mode?: 'aspectFill' | 'aspectFit' | 'scaleToFill'
}

export function ImageWithFallback({ src, className = '', style, mode = 'aspectFill' }: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false)

  if (didError) {
    return (
      <View className={`${styles.fallback} ${className}`} style={style}>
        <Image src={ERROR_IMG_SRC} mode='aspectFit' className={styles.errorImg} />
      </View>
    )
  }

  return (
    <Image
      src={src}
      className={className}
      style={style}
      mode={mode}
      onError={() => setDidError(true)}
    />
  )
}
