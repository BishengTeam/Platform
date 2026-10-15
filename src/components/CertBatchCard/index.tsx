import { Text, View } from '@tarojs/components'
import { Button } from '@/components/Button'
import styles from './index.module.scss'

export interface CertBatchInfoItem {
  label: string
  value: string
  full?: boolean
}

interface Props {
  title: string
  badge: string
  badgeTone?: 'blue' | 'purple' | 'green' | 'orange' | 'gray'
  infoItems: CertBatchInfoItem[]
  actionText: string
  actionDisabled?: boolean
  actionLoading?: boolean
  onAction?: () => void
}

export function CertBatchCard({
  title,
  badge,
  badgeTone = 'blue',
  infoItems,
  actionText,
  actionDisabled,
  actionLoading,
  onAction,
}: Props) {
  return (
    <View className={styles.card}>
      <View className={styles.cardHeader}>
        <Text className={styles.title}>{title}</Text>
        <Text className={`${styles.badge} ${styles[badgeTone]}`}>{badge}</Text>
      </View>

      <View className={styles.infoGrid}>
        {infoItems.map(item => (
          <View
            key={`${item.label}-${item.value}`}
            className={`${styles.infoItem} ${item.full ? styles.infoItemFull : ''}`}
          >
            <Text className={styles.infoLabel}>{item.label}</Text>
            <Text className={styles.infoValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      <View className={styles.actionRow}>
        <Button
          variant='gradient'
          disabled={actionDisabled}
          loading={actionLoading}
          onClick={onAction}
        >
          {actionText}
        </Button>
      </View>
    </View>
  )
}
