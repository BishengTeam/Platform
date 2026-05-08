import { View, Text } from '@tarojs/components'
import styles from './index.module.scss'

interface PriceRowProps {
  label: string
  value: number
  isTotal?: boolean
  className?: string
}

export function PriceRow({ label, value, isTotal = false, className = '' }: PriceRowProps) {
  return (
    <View className={`${styles.row} ${isTotal ? styles.rowTotal : ''} ${className}`}>
      <Text className={styles.label}>{label}</Text>
      <Text className={styles.value}>
        {value >= 0 ? '¥' : '-¥'}{Math.abs(value).toFixed(2)}
      </Text>
    </View>
  )
}
