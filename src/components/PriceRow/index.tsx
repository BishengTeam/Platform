import { View, Text } from '@tarojs/components'
import styles from './index.module.scss'

interface PriceRowProps {
  label: string
  value: number
  isTotal?: boolean
  isStrikethrough?: boolean
  prefix?: string
  className?: string
}

export function PriceRow({
  label,
  value,
  isTotal = false,
  isStrikethrough = false,
  prefix = '¥',
  className = '',
}: PriceRowProps) {
  return (
    <View className={`${styles.row} ${isTotal ? styles.rowTotal : ''} ${className}`}>
      <Text className={styles.label}>{label}</Text>
      <Text
        className={`${styles.value} ${isTotal ? styles.valueTotal : ''} ${isStrikethrough ? styles.strikethrough : ''}`}
      >
        {value < 0 ? `-${prefix}${Math.abs(value).toFixed(2)}` : `${prefix}${value.toFixed(2)}`}
      </Text>
    </View>
  )
}
