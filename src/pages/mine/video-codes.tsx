import { useCallback, useEffect, useMemo, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { RefreshableScrollView } from '@/components/RefreshableScrollView'
import { STRINGS } from '@/constants/strings'
import { getCourseList } from '@/services/courseService'
import { getMyVideoWebCodes, type VideoWebCode } from '@/services/videoWebService'
import styles from './video-codes.module.scss'

const STATUS_META: Record<VideoWebCode['status'], { label: string; className: string }> = {
  issued: { label: STRINGS.MINE_VIDEO_CODES_STATUS_ISSUED, className: styles.badgeIssued },
  redeemed: { label: STRINGS.MINE_VIDEO_CODES_STATUS_REDEEMED, className: styles.badgeRedeemed },
  revoked: { label: STRINGS.MINE_VIDEO_CODES_STATUS_REVOKED, className: styles.badgeInvalid },
  refunded: { label: STRINGS.MINE_VIDEO_CODES_STATUS_REFUNDED, className: styles.badgeInvalid },
}

export default function MyVideoCodesPage() {
  const [codes, setCodes] = useState<VideoWebCode[]>([])
  const [courseTitles, setCourseTitles] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [codeItems, courses] = await Promise.all([
        getMyVideoWebCodes(),
        getCourseList().catch(() => []),
      ])
      setCodes(codeItems)
      setCourseTitles(Object.fromEntries(courses.map(item => [item.id, item.title])))
    } catch {
      setError(STRINGS.MINE_VIDEO_CODES_LOAD_FAILED)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const orderedCodes = useMemo(() => {
    const weight: Record<VideoWebCode['status'], number> = {
      issued: 0,
      redeemed: 1,
      refunded: 2,
      revoked: 3,
    }
    return [...codes].sort((a, b) => weight[a.status] - weight[b.status] || b.id - a.id)
  }, [codes])

  const copyCode = (code: string) => {
    Taro.setClipboardData({
      data: code,
      success: () => Taro.showToast({ title: STRINGS.MINE_VIDEO_CODES_COPIED, icon: 'success' }),
    })
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.MINE_VIDEO_CODES_TITLE} shouldShowBack />
        <RefreshableScrollView className={styles.body} onRefresh={load}>
          <View className={styles.bodyInner}>
            {loading ? (
              <EmptyState title={STRINGS.AGREEMENT_LOADING} />
            ) : error ? (
              <EmptyState title={error} />
            ) : orderedCodes.length === 0 ? (
              <EmptyState title={STRINGS.MINE_VIDEO_CODES_EMPTY} />
            ) : orderedCodes.map(item => (
              <View key={item.id} className={styles.card}>
                <View className={styles.cardHeader}>
                  <Text className={styles.courseTitle}>
                    {courseTitles[item.course_id] || `${STRINGS.MINE_VIDEO_CODES_COURSE} #${item.course_id}`}
                  </Text>
                  <Text className={`${styles.badge} ${STATUS_META[item.status].className}`}>
                    {STATUS_META[item.status].label}
                  </Text>
                </View>
                <View className={styles.codeRow}>
                  <Text className={styles.codeText}>{item.code}</Text>
                </View>
                <Text className={styles.meta}>
                  {STRINGS.MINE_VIDEO_CODES_GENERATED_AT}{item.created_at.slice(0, 10)}
                </Text>
                {item.status === 'issued' && (
                  <Button
                    size='sm'
                    className={styles.copyButton}
                    onClick={() => copyCode(item.code)}
                  >
                    {STRINGS.MINE_VIDEO_CODES_COPY}
                  </Button>
                )}
              </View>
            ))}
          </View>
        </RefreshableScrollView>
      </View>
    </AuthGuard>
  )
}
