import { View, Text } from '@tarojs/components'
import { Icon } from '@/components/Icon'
import { STRINGS } from '@/constants/strings'
import styles from './index.module.scss'

interface Props {
  title: string
  onViewAll?: () => void
  viewAllText?: string
}

export function SectionHeader({ title, onViewAll, viewAllText = STRINGS.INDEX_VIEW_ALL }: Props) {
  return (
    <View className={styles.header}>
      <Text className={styles.title}>{title}</Text>
      {onViewAll && (
        <View className={styles.more} onClick={onViewAll}>
          <Text className={styles.moreText}>{viewAllText}</Text>
          <Icon name='chevron-right' size={14} color='#999999' />
        </View>
      )}
    </View>
  )
}
