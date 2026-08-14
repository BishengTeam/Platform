import { useCallback, useEffect, useState } from 'react'
import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { CheckinBar } from '@/components/CheckinBar'
import { PageHeader } from '@/components/PageHeader'
import { QuizBottomNav } from '@/components/QuizBottomNav'
import { QuizGrid } from '@/components/QuizGrid'
import { QUIZ_BOTTOM, QUIZ_GRID } from '@/constants/quiz'
import type { QuizBottomItem } from '@/constants/quiz'
import { ROUTES } from '@/constants/routes'
import { STRINGS } from '@/constants/strings'
import type { QuizLibraryCatalogDetail, QuizLibraryCatalogItem, QuizPracticeScopeType, QuizStats } from '@/contracts/quiz'
import { useAuth } from '@/hooks/useAuth'
import { getQuizCheckinStatus, getQuizLibrary, getQuizStats, listQuizLibraries } from '@/services/dataService'
import styles from './index.module.scss'

interface StatCard { label: string; value: string; color: string }

const COLORS = ['#1677FF', '#52C41A', '#722ED1', '#FF4D4F', '#FA8C16', '#13C2C2']

export default function QuizIndexPage() {
  const { isChecked, isLoggedIn } = useAuth()
  const [libraries, setLibraries] = useState<QuizLibraryCatalogItem[]>([])
  const [expanded, setExpanded] = useState<Record<number, QuizLibraryCatalogDetail>>({})
  const [stats, setStats] = useState<QuizStats | null>(null)
  const [streakDays, setStreakDays] = useState(0)
  const [loading, setLoading] = useState(true)
  const [catalogError, setCatalogError] = useState(false)

  const requireLogin = useCallback((action: () => void) => {
    if (isLoggedIn) action()
    else Taro.navigateTo({ url: `/${ROUTES.AUTH}` })
  }, [isLoggedIn])

  const loadPersonal = useCallback(() => {
    if (!isChecked || !isLoggedIn) return
    Promise.all([getQuizCheckinStatus(), getQuizStats()])
      .then(([checkin, nextStats]) => {
        setStreakDays(checkin.consecutive_days)
        setStats(nextStats)
      })
      .catch(() => undefined)
  }, [isChecked, isLoggedIn])

  useDidShow(() => {
    setLoading(true)
    setCatalogError(false)
    listQuizLibraries()
      .then(setLibraries)
      .catch(() => setCatalogError(true))
      .finally(() => setLoading(false))
    loadPersonal()
  })

  // Authentication restoration can finish after the first page-show event.
  // React to that transition so a restored user receives personal data on the
  // first visit without having to leave and reopen the page.
  useEffect(() => {
    if (!isChecked) return
    if (!isLoggedIn) {
      setStats(null)
      setStreakDays(0)
      return
    }
    loadPersonal()
  }, [isChecked, isLoggedIn, loadPersonal])

  const handleGrid = useCallback((item: { mode: string }) => requireLogin(() => {
    if (item.mode === 'mock') Taro.navigateTo({ url: `/${ROUTES.QUIZ_MOCK}` })
    else if (item.mode === 'history') Taro.navigateTo({ url: `/${ROUTES.QUIZ_HISTORY}` })
    else if (item.mode === 'stats') Taro.navigateTo({ url: `/${ROUTES.QUIZ_STATS}` })
    else Taro.showToast({ title: '请从下方题库目录选择练习范围', icon: 'none' })
  }), [requireLogin])

  const toggleLibrary = useCallback(async (libraryId: number) => {
    if (expanded[libraryId]) {
      setExpanded(previous => {
        const next = { ...previous }
        delete next[libraryId]
        return next
      })
      return
    }
    try {
      const detail = await getQuizLibrary(libraryId)
      setExpanded(previous => ({ ...previous, [libraryId]: detail }))
    } catch {
      Taro.showToast({ title: '题库目录加载失败', icon: 'none' })
    }
  }, [expanded])

  const practiceUrl = (scopeType: QuizPracticeScopeType, scopeId: number) =>
    `/${ROUTES.QUIZ_PRACTICE}?scopeType=${scopeType}&scopeId=${scopeId}`

  const statCards: StatCard[] = stats ? [
    { label: '练习作答', value: String(stats.practice.total_attempts), color: COLORS[0] },
    { label: '首答正确率', value: `${stats.practice.accuracy}%`, color: COLORS[1] },
    { label: '已答题目', value: String(stats.practice.answered_questions), color: COLORS[2] },
    { label: '当前错题', value: String(stats.practice.active_wrong_count), color: COLORS[3] },
    { label: STRINGS.QUIZ_CHECKIN_STREAK, value: `${stats.practice.consecutive_days}天`, color: COLORS[4] },
    { label: STRINGS.QUIZ_STATS_TODAY, value: String(stats.practice.today_questions), color: COLORS[5] },
  ] : []

  return (
    <View className={styles.page}>
      <PageHeader title={STRINGS.QUIZ_HEADER} shouldShowBack />
      <ScrollView className={styles.body} scrollY>
        {isLoggedIn && (
          <CheckinBar streakDays={streakDays} onCheckin={() => Taro.navigateTo({ url: `/${ROUTES.QUIZ_CHECKIN}` })} />
        )}

        {statCards.length > 0 && (
          <View className={styles.statsPanel}>
            <View className={styles.statsGrid}>
              {statCards.map(card => (
                <View key={card.label} className={styles.statCard}>
                  <Text className={styles.statValue} style={{ color: card.color }}>{card.value}</Text>
                  <Text className={styles.statLabel}>{card.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <QuizGrid items={QUIZ_GRID} onItemClick={handleGrid} />
        {loading && <Text className={styles.stateText}>正在加载题库…</Text>}
        {!loading && catalogError && <Text className={styles.stateText}>题库加载失败，请稍后重试</Text>}
        {!loading && !catalogError && libraries.length === 0 && <Text className={styles.stateText}>暂无可用题库</Text>}
        <View className={styles.libraryList}>
          {libraries.map(library => {
            const detail = expanded[library.id]
            return (
              <View key={library.id} className={styles.libraryCard}>
                <View className={styles.libraryHeader} onClick={() => void toggleLibrary(library.id)}>
                  {library.cover_url ? <Image className={styles.libraryCover} src={library.cover_url} mode='aspectFill' /> : <View className={styles.libraryCoverPlaceholder}><Text>题库</Text></View>}
                  <View className={styles.libraryInfo}>
                    <Text className={styles.libraryName}>{library.name}</Text>
                    <Text className={styles.libraryDescription}>{library.description}</Text>
                    <Text className={styles.libraryMeta}>{library.module_count} 个模块 · {library.question_count} 题 · {library.access_mode === 'free' ? '免费' : '课程附赠'}</Text>
                  </View>
                  <Text className={styles.expandIcon}>{detail ? '收起' : '展开'}</Text>
                </View>
                {detail && (
                  <View className={styles.catalogTree}>
                    <View className={styles.scopeRow} onClick={() => requireLogin(() => Taro.navigateTo({ url: practiceUrl('library', library.id) }))}>
                      <Text className={styles.scopeName}>练习整库全部 {detail.question_count} 题</Text><Text className={styles.scopeAction}>开始</Text>
                    </View>
                    {detail.modules.map(module => (
                      <View key={module.id} className={styles.moduleBlock}>
                        <View className={styles.scopeRow} onClick={() => requireLogin(() => Taro.navigateTo({ url: practiceUrl('module', module.id) }))}>
                          <Text className={styles.moduleName}>{module.name} · {module.question_count} 题</Text><Text className={styles.scopeAction}>练习模块</Text>
                        </View>
                        {module.knowledge_points.map(point => (
                          <View key={point.id} className={styles.pointRow} onClick={() => requireLogin(() => Taro.navigateTo({ url: practiceUrl('knowledge_point', point.id) }))}>
                            <Text>{point.name}</Text><Text className={styles.scopeAction}>{point.question_count} 题 ›</Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )
          })}
        </View>
        <QuizBottomNav items={QUIZ_BOTTOM} onItemClick={(item: QuizBottomItem) => requireLogin(() => Taro.navigateTo({ url: `/${item.route}` }))} />
      </ScrollView>
    </View>
  )
}
