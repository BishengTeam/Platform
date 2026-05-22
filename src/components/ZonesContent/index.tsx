import { useCallback } from 'react'
import { View } from '@tarojs/components'
import { ZONE_ROUTES, ZONE_ROUTE_KEYS } from '@/constants/routes'
import { STRINGS } from '@/constants/strings'
import styles from './index.module.scss'

interface Props {
  onZoneTap?: (url: string) => void
}

function getZoneRoute(zoneName: string): string | undefined {
  const idx = STRINGS.ZONE_NAMES.indexOf(zoneName as typeof STRINGS.ZONE_NAMES[number])
  if (idx < 0) return undefined
  return ZONE_ROUTES[ZONE_ROUTE_KEYS[idx]]
}

export function ZonesContent({ onZoneTap }: Props) {
  const handleNavigate = useCallback((e: { currentTarget: { dataset: Record<string, string> } }) => {
    const zone = e.currentTarget.dataset.zone
    if (!zone) return
    const url = getZoneRoute(zone)
    if (url) onZoneTap?.(url)
  }, [onZoneTap])

  return (
    <View className={styles.gridCard}>
        <View className={styles.gridTitle}>{STRINGS.ZONES_GRID_TITLE}</View>
        <View className={styles.grid}>
          {STRINGS.ZONE_NAMES.map((zone) => (
            <View key={zone} className={styles.gridItem} data-zone={zone} onClick={handleNavigate}>
              <View className={styles.gridItemText}>{zone}</View>
              <View className={styles.gridItemSub}>{STRINGS.ZONES_GRID_DETAIL}</View>
            </View>
          ))}
        </View>
    </View>
  )
}
