import { View, Text } from '@tarojs/components'
import { Icon } from '@/components/Icon'
import { STRINGS } from '@/constants/strings'
import styles from './index.module.scss'

interface MetaItem {
  label: string
}

interface Props {
  icon: string
  iconColor: string
  title: string
  description?: string
  meta?: MetaItem[]
  actionText: string
  onClick?: () => void
}

export function ChatRichCard({ icon, iconColor, title, description, meta, actionText, onClick }: Props) {
  return (
    <View className={styles.card} onClick={onClick}>
      <View className={styles.header}>
        <Icon name={icon} size={18} color={iconColor} />
        <View className={styles.titleWrap}>
          <View className={styles.title}>{title}</View>
        </View>
      </View>
      {description && <View className={styles.desc}>{description}</View>}
      {meta && meta.length > 0 && (
        <View className={styles.meta}>
          {meta.map((item, i) => (
            <View key={i} className={styles.metaItem}>{item.label}</View>
          ))}
        </View>
      )}
      <View className={styles.action}>
        <View className={styles.actionText}>{actionText}</View>
      </View>
    </View>
  )
}
