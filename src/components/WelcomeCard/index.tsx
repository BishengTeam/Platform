import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Icon } from '@/components/Icon'
import { ZONE_ROUTES } from '@/constants/routes'
import { STRINGS } from '@/constants/strings'
import { getZoneIcons } from '@/services/dataService'
import styles from './index.module.scss'

export function WelcomeCard() {
  const handleZoneNavigate = (route: string) => {
    Taro.navigateTo({ url: route })
  }

  return (
    <View className={styles.card}>
      <Text className={styles.title}>{STRINGS.INDEX_WELCOME_TITLE}</Text>
      <Text className={styles.subtitle}>{STRINGS.INDEX_WELCOME_SUB}</Text>
      <ScrollView scrollX className={styles.zoneRow}>
        {getZoneIcons().map((zone) => (
          <View key={zone.id} className={styles.zoneItem} onClick={() => handleZoneNavigate(ZONE_ROUTES[zone.name])}>
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
