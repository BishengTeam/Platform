import { View, Text } from '@tarojs/components'
import styles from './index.module.scss'

interface PriceRowProps {
  label: string
  value: number
  isTotal?: boolean
  isStrikethrough?: boolean
  prefix?: string
  className?: string
  size?: 'normal' | 'lg'
}

export function PriceRow({
  label,
  value,
  isTotal = false,
  isStrikethrough = false,
  prefix = '¥',
  className = '',
  size = 'normal',
}: PriceRowProps) {
  // 兼容运行时传入字符串/非法值的情况，避免 .toFixed 报错
  const numericValue = Number(value ?? 0)
  const safeValue = Number.isNaN(numericValue) ? 0 : numericValue

  return (
    <View className={`${styles.row} ${isTotal ? styles.rowTotal : ''} ${size === 'lg' ? styles.lg : ''} ${className}`}>
      <Text className={`${styles.label} ${size === 'lg' ? styles.labelLg : ''}`}>{label}</Text>
      <Text
        className={`${styles.value} ${isTotal ? styles.valueTotal : ''} ${isStrikethrough ? styles.strikethrough : ''} ${size === 'lg' && !isTotal ? styles.valueLg : ''} ${size === 'lg' && isTotal ? styles.valueTotalLg : ''}`}
      >
        {prefix}{safeValue.toFixed(2)}
      </Text>
    </View>
  )
}
