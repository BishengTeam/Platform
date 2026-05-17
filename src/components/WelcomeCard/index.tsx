import { View, Text, ScrollView } from '@tarojs/components'
import { Icon } from '@/components/Icon'
import { ZONE_ROUTES } from '@/constants/routes'
import { STRINGS } from '@/constants/strings'
import type { ZoneIcon } from '@/types'
import styles from './index.module.scss'

interface WelcomeCardProps {
  zoneIcons: ZoneIcon[]
  onZoneTap?: (route: string) => void
}

export function WelcomeCard({ zoneIcons, onZoneTap }: WelcomeCardProps) {
  return (
    <View className={styles.card}>
      <Text className={styles.title}>{STRINGS.INDEX_WELCOME_TITLE}</Text>
      <Text className={styles.subtitle}>{STRINGS.INDEX_WELCOME_SUB}</Text>
      <ScrollView scrollX className={styles.zoneRow}>
        {zoneIcons.map((zone) => (
          <View key={zone.id} className={styles.zoneItem} onClick={() => onZoneTap?.(ZONE_ROUTES[zone.id])}>
            <View className={styles.zoneIcon} style={{ backgroundColor: zone.bg }}>
              <Icon name={zone.icon} size={24} color={zone.color} />
            </View>
            <Text className={styles.zoneName}>{zone.name}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}
