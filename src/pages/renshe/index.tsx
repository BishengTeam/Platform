import { useCallback, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useLoad, usePullDownRefresh } from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { RefreshableScrollView } from '@/components/RefreshableScrollView'
import { Button } from '@/components/Button'
import { ROUTES } from '@/constants/routes'
import { rensheService, type RenshePlan } from '@/services/rensheService'
import { formatDateTime, formatDate } from '@/utils/format'
import styles from './renshe.module.scss'

export default function RensheIndexPage() {
  const [batches, setBatches] = useState<RenshePlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    return rensheService.listBatches()
      .then(setBatches)
      .catch(() => {
        setBatches([])
        setError(true)
      })
      .finally(() => setLoading(false))
  }, [])

  useLoad(() => { void load() })
  usePullDownRefresh(async () => {
    await load()
    Taro.stopPullDownRefresh()
  })

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title='人社认证' shouldShowBack />
        <RefreshableScrollView className={styles.body} onRefresh={load}>
          <Button
            variant='secondary'
            size='lg'
            onClick={() => Taro.navigateTo({ url: `/${ROUTES.MINE_REGISTRATIONS}` })}
          >
            我的报名
          </Button>

          <Text className={styles.sectionTitle}>职业技能等级认证</Text>
          <Text className={styles.sectionDesc}>
            报名前请确认实名认证、学生信息及六类证明材料均已审核通过；具体报考项目以所选批次展示为准。
          </Text>

          {loading && <View className={styles.loading}>正在加载认证批次...</View>}
          {error && (
            <View className={styles.empty} onClick={() => { void load() }}>
              <Text>加载失败，点击重试</Text>
            </View>
          )}

          {!loading && !error && batches.length === 0 && (
            <View className={styles.empty}>
              <Text>暂无开放报名批次</Text>
              <Text className={styles.emptyHint}>请联系老师发布人社认证批次</Text>
            </View>
          )}

          {!loading && !error && batches.map(batch => {
            const remaining = batch.capacity === 0
              ? '不限'
              : `${Math.max(batch.capacity - batch.enrolled, 0)} 名`
            return (
              <View key={batch.id} className={styles.card}>
                <View className={styles.cardHeader}>
                  <Text className={styles.title}>{batch.name}</Text>
                  <Text className={styles.badge}>{batch.occupation_name}</Text>
                </View>

                <View className={styles.row}>
                  <Text className={styles.label}>报名时间</Text>
                  <Text className={styles.value}>
                    {formatDate(batch.apply_start)} ~ {formatDate(batch.apply_end)}
                  </Text>
                </View>
                <View className={styles.row}>
                  <Text className={styles.label}>考试时间</Text>
                  <Text className={styles.value}>{formatDateTime(batch.exam_date, '待定')}</Text>
                </View>
                <View className={styles.row}>
                  <Text className={styles.label}>考试地点</Text>
                  <Text className={styles.value}>{batch.exam_location || '以批次安排为准'}</Text>
                </View>
                <View className={styles.row}>
                  <Text className={styles.label}>申报类型</Text>
                  <Text className={styles.value}>
                    {batch.application_type} · {batch.exam_type} · {batch.skill_level}
                  </Text>
                </View>

                <View className={styles.footer}>
                  <View>
                    <Text className={styles.label}>剩余名额</Text>
                    <Text className={styles.value}>{remaining}</Text>
                  </View>
                  <Text className={styles.price}>¥{(batch.price_cents / 100).toFixed(2)}</Text>
                  <Button
                    variant='primary'
                    onClick={() => Taro.navigateTo({
                      url: `/${ROUTES.RENSHE_FORM}?plan_id=${batch.id}`,
                    })}
                  >
                    立即报名
                  </Button>
                </View>
              </View>
            )
          })}
        </RefreshableScrollView>
      </View>
    </AuthGuard>
  )
}
