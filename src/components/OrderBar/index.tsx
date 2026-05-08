import { View, Text } from '@tarojs/components'
import { Icon } from '@/components/Icon'
import { ROUTES } from '@/constants/routes'
import { STRINGS } from '@/constants/strings'
import { getOrderItems } from '@/services/dataService'
import styles from './index.module.scss'

interface OrderBarProps {
  onNavigate: (route: string) => void
}

export function OrderBar({ onNavigate }: OrderBarProps) {
  return (
    <View className={styles.card}>
      <View className={styles.head}>
        <Text className={styles.title}>{STRINGS.PROFILE_ORDERS}</Text>
        <View className={styles.more} onClick={() => onNavigate(ROUTES.ORDERS)}>
          <Text>{STRINGS.PROFILE_ALL_ORDERS}</Text>
          <Icon name='chevron-right' size={14} color='#999' />
        </View>
      </View>
      <View className={styles.orders}>
        {getOrderItems().map((item, idx) => (
          <View
            key={idx}
            className={styles.item}
            onClick={() => onNavigate(`${ROUTES.ORDERS}?status=${item.label}`)}
          >
            <View className={styles.iconWrap}>
              <Icon name={item.icon} size={20} color='#1677FF' />
              {item.badge > 0 && (
                <View className={styles.badge}>{item.badge}</View>
              )}
            </View>
            <Text className={styles.label}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
