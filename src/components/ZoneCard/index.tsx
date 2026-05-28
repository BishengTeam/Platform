import { View } from '@tarojs/components'
import { Button } from '@/components/Button'
import styles from './index.module.scss'

interface ZoneCardProps {
  title: string
  subtitle?: string
  tags?: string[]
  price?: string
  originalPrice?: string
  statusLabel?: string
  statusColor?: string
  buttonText: string
  buttonVariant?: 'primary' | 'secondary' | 'gradient'
  onButtonClick?: () => void
  onCardClick?: () => void
  isFaded?: boolean
  className?: string
}

export function ZoneCard({
  title,
  subtitle,
  tags = [],
  price,
  originalPrice,
  statusLabel,
  statusColor,
  buttonText,
  buttonVariant = 'primary',
  onButtonClick,
  onCardClick,
  isFaded = false,
  className = '',
}: ZoneCardProps) {
  return (
    <View
      onClick={onCardClick}
      className={`${styles.card} ${isFaded ? styles.faded : ''} ${className}`}
    >
      <View className={styles.header}>
        <View className={styles.title}>{title}</View>
        {statusLabel && (
          <View className={styles.statusTag} style={statusColor ? { color: statusColor, borderColor: statusColor } : undefined}>
            {statusLabel}
          </View>
        )}
      </View>
      {subtitle && <View className={styles.subtitle}>{subtitle}</View>}
      {tags.length > 0 && (
        <View className={styles.tags}>
          {tags.map((tag, i) => (
            <View key={i} className={styles.tag}>{tag}</View>
          ))}
        </View>
      )}
      <View className={styles.bottom}>
        {price ? (
          <View className={styles.priceRow}>
            <View className={styles.price}>{price}</View>
            {originalPrice && (
              <View className={styles.originalPrice}>{originalPrice}</View>
            )}
          </View>
        ) : (
          <View />
        )}
        <Button
          variant={buttonVariant}
          size='sm'
          className={styles.btn}
          onClick={onButtonClick}
        >
          {buttonText}
        </Button>
      </View>
    </View>
  )
}
