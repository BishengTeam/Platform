import { View, Text } from '@tarojs/components'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import styles from './index.module.scss'

interface CheckinBarProps {
  streakDays: number
  onCheckin: () => void
}

export function CheckinBar({ streakDays, onCheckin }: CheckinBarProps) {
  return (
    <View className={styles.checkinBar}>
      <View className={styles.checkinInfo}>
        <Text className={styles.checkinStreak}>
          {STRINGS.QUIZ_CHECKIN_STREAK} {streakDays} {STRINGS.QUIZ_CHECKIN_DAYS}
        </Text>
      </View>
      <Button size='sm' onClick={onCheckin}>
        {STRINGS.QUIZ_CHECKIN_BTN}
      </Button>
    </View>
  )
}
