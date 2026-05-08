import { View, Text } from '@tarojs/components'
import styles from './index.module.scss'

interface PriceRowProps {
  label: string
  amount: number
  highlight?: boolean
  strikethrough?: boolean
  prefix?: string
}

export function PriceRow({
  label,
  amount,
  highlight = false,
  strikethrough = false,
  prefix = '¥',
}: PriceRowProps) {
  return (
    <View className={styles.row}>
      <Text className={styles.label}>{label}</Text>
      <Text className={`${styles.amount} ${highlight ? styles.highlight : ''} ${strikethrough ? styles.strikethrough : ''}`}>
        {amount < 0 ? `-${prefix}${Math.abs(amount)}` : `${prefix}${amount}`}
      </Text>
    </View>
  )
}
