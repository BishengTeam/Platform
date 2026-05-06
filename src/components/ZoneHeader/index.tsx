import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Icon } from '@/components/Icon'
import styles from './index.module.scss'

interface ZoneHeaderProps {
  title: string
  showFilter?: boolean
  onFilterClick?: () => void
}

export function ZoneHeader({ title, showFilter = true, onFilterClick }: ZoneHeaderProps) {
  const handleBack = () => {
    Taro.navigateBack()
  }

  return (
    <View className={styles.header}>
      <View className={styles.btn} onClick={handleBack}>
        <Icon name='chevron-left' size={20} color='#333333' />
      </View>
      <View className={styles.title}>{title}</View>
      {showFilter ? (
        <View className={styles.btn} onClick={onFilterClick}>
          <Icon name='filter' size={20} color='#333333' />
        </View>
      ) : (
        <View className={styles.placeholder} />
      )}
    </View>
  )
}
