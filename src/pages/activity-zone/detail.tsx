import { useEffect, useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { getActivityList, enrollActivity, remindActivity } from '@/services/zoneService'
import type { ActivityBrief } from '@/types'

function fmtTime(iso: string | null): string {
  if (!iso) return '待定'
  return iso.slice(0, 16).replace('T', ' ')
}
import styles from './detail.module.scss'

export default function ActivityDetailPage() {
  const { params } = useRouter()
  const activityId = Number(params?.id)
  const [activity, setActivity] = useState<ActivityBrief | null>(null)
  const [loading, setLoading] = useState(true)
  const [joined, setJoined] = useState(false)
  const [reminded, setReminded] = useState(false)

  useEffect(() => {
    if (!Number.isFinite(activityId) || activityId <= 0) {
      setLoading(false)
      return
    }
    getActivityList()
      .then((items) => setActivity(items.find((a) => a.id === activityId) ?? null))
      .catch(() => setActivity(null))
      .finally(() => setLoading(false))
  }, [activityId])

  const handleJoin = async () => {
    if (!activity || joined) return
    try {
      await enrollActivity(activity.id)
      setJoined(true)
      Taro.showToast({ title: '报名成功', icon: 'success' })
    } catch { /* 错误已由 request 层统一 toast */ }
  }

  const handleRemind = async () => {
    if (!activity || reminded) return
    try {
      await remindActivity(activity.id)
      setReminded(true)
      Taro.showToast({ title: '已设置提醒', icon: 'success' })
    } catch { /* 错误已由 request 层统一 toast */ }
  }

  return (
    <View className={styles.container}>
      <PageHeader title='活动详情' shouldShowBack onBack={() => Taro.navigateBack()} />

      {loading && <View className={styles.placeholder}>加载中…</View>}

      {!loading && !activity && (
        <View className={styles.placeholder}>活动不存在或已下架</View>
      )}

      {!loading && activity && (
        <View className={styles.detail}>
          {activity.cover_url && (
            <Image className={styles.cover} src={activity.cover_url} mode='aspectFill' />
          )}
          <View className={styles.title}>{activity.title}</View>

          <View className={styles.metaList}>
            <View className={styles.metaItem}>
              <Text className={styles.metaLabel}>时间</Text>
              <Text className={styles.metaValue}>
                {fmtTime(activity.start_time)} ~ {fmtTime(activity.end_time)}
              </Text>
            </View>
            <View className={styles.metaItem}>
              <Text className={styles.metaLabel}>地点</Text>
              <Text className={styles.metaValue}>{activity.location || '待定'}</Text>
            </View>
            {activity.max_participants != null && activity.max_participants > 0 && (
              <View className={styles.metaItem}>
                <Text className={styles.metaLabel}>名额</Text>
                <Text className={styles.metaValue}>{activity.max_participants} 人</Text>
              </View>
            )}
          </View>

          {activity.description && (
            <View className={styles.section}>
              <View className={styles.sectionTitle}>活动介绍</View>
              <View className={styles.sectionBody}>{activity.description}</View>
            </View>
          )}

          <View className={styles.actions}>
            <Button
              variant='primary'
              onClick={handleJoin}
              className={styles.actionBtn}
            >
              {joined ? '已报名' : '立即报名'}
            </Button>
            <Button
              variant='secondary'
              onClick={handleRemind}
              className={styles.actionBtn}
            >
              {reminded ? '已设提醒' : '开赛提醒'}
            </Button>
          </View>
        </View>
      )}
    </View>
  )
}
