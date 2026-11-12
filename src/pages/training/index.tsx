import { getToken, getAuthSessionId } from '@/utils/authState'
import { useAuth } from '@/hooks/useAuth'
import { navigateWithLogin } from '@/utils/loginCoordinator'
import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { PageHeader } from '@/components/PageHeader'
import { Icon } from '@/components/Icon'
import { CustomTabBar } from '@/components/TabBar'
import { RefreshableScrollView } from '@/components/RefreshableScrollView'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import { toBase64 } from '@/utils/base64'
import { getQuizLibrary, getQuizStats, listQuizLibraries } from '@/services/dataService'
import { clearRememberedScope, readRememberedScope, rememberScope } from '@/utils/practiceScope'
import type { QuizLibraryCatalogItem, QuizPracticeScopeType, QuizStats } from '@/contracts/quiz'
import styles from './index.module.scss'

// 在线课程已下线，学习页仅承载练习助手。
// 选题交互改版（2026-11-12）：首页只保留记忆态范围卡，「选择」跳独立题库列表页（pages/quiz/libraries）。

interface QuickAction {
  label: string
  icon: string
  route: string
  iconBg: string
  iconColor: string
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: '模拟考试', icon: 'clipboard', route: ROUTES.QUIZ_MOCK, iconBg: '#EFF6FF', iconColor: '#2563EB' },
  { label: '练习历史', icon: 'file-text', route: ROUTES.QUIZ_HISTORY, iconBg: '#F5F3FF', iconColor: '#7C3AED' },
  { label: '错题本', icon: 'book-open', route: ROUTES.QUIZ_WRONG_BOOK, iconBg: '#FEF2F2', iconColor: '#DC2626' },
  { label: '我的收藏', icon: 'star', route: ROUTES.QUIZ_COLLECTIONS, iconBg: '#FEFCE8', iconColor: '#EA580C' },
]

const EMPTY_STATE_ILLUSTRATION = `data:image/svg+xml;base64,${toBase64(`
  <svg xmlns="http://www.w3.org/2000/svg" width="160" height="112" viewBox="0 0 160 112" fill="none">
    <defs>
      <linearGradient id="g" x1="24" y1="12" x2="136" y2="100" gradientUnits="userSpaceOnUse">
        <stop stop-color="#EAF2FF"/><stop offset="1" stop-color="#F7F8FA"/>
      </linearGradient>
    </defs>
    <rect x="18" y="16" width="124" height="80" rx="16" fill="url(#g)" stroke="#C9D8F5"/>
    <path d="M42 42h44M42 58h76M42 74h28" stroke="#94B4F4" stroke-width="5" stroke-linecap="round"/>
    <circle cx="118" cy="72" r="15" fill="#fff" stroke="#BFDBFE" stroke-width="4"/>
    <path d="M116 66.5h4M118 70v5M116 78h4" stroke="#165DFF" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M30 20l4 8 8 4-8 4-4 8-4-8-8-4 8-4z" fill="#DBEAFE"/>
  </svg>
`.trim())}`

interface PracticeScope {
  type: QuizPracticeScopeType
  id: number
  name: string
  libraryId: number
  libraryName: string
  questionCount: number
}

function libraryScopeOf(library: QuizLibraryCatalogItem): PracticeScope {
  return {
    type: 'library',
    id: library.id,
    name: library.name,
    libraryId: library.id,
    libraryName: library.name,
    questionCount: library.question_count,
  }
}

export default function TrainingPage() {
  const { isLoggedIn, sessionId } = useAuth()
  const [quizLibraries, setQuizLibraries] = useState<QuizLibraryCatalogItem[]>([])
  const [selectedScope, setSelectedScope] = useState<PracticeScope | null>(null)
  const [quizStats, setQuizStats] = useState<QuizStats | null>(null)
  const librariesLoadedRef = useRef(false)
  const quizLibrariesRef = useRef<QuizLibraryCatalogItem[]>([])
  // 记忆态校验含异步详情请求，用递增序号丢弃过期回写（快速进出列表页时防串台）
  const syncEpoch = useRef(0)

  const applyScope = useCallback((scope: PracticeScope | null, persistClear: boolean) => {
    setSelectedScope(scope)
    if (!scope && persistClear) clearRememberedScope()
  }, [])

  // 校验记忆态：库没了→清空；模块/知识点没了→降级到库级
  const syncScope = useCallback(async (libraries: QuizLibraryCatalogItem[], loaded: boolean) => {
    const epoch = ++syncEpoch.current
    const memory = readRememberedScope()
    if (!memory) {
      applyScope(null, false)
      return
    }
    const library = libraries.find(item => item.id === memory.libraryId)
    if (!library) {
      applyScope(null, loaded)
      return
    }
    if (memory.type === 'library') {
      applyScope(libraryScopeOf(library), false)
      return
    }
    try {
      const detail = await getQuizLibrary(library.id)
      if (syncEpoch.current !== epoch) return
      if (memory.type === 'module') {
        const module = detail.modules.find(item => item.id === memory.id)
        if (module) {
          applyScope({
            type: 'module',
            id: module.id,
            name: module.name,
            libraryId: library.id,
            libraryName: library.name,
            questionCount: module.question_count,
          }, false)
          return
        }
      } else {
        for (const module of detail.modules) {
          const point = module.knowledge_points.find(item => item.id === memory.id)
          if (point) {
            applyScope({
              type: 'knowledge_point',
              id: point.id,
              name: point.name,
              libraryId: library.id,
              libraryName: library.name,
              questionCount: point.question_count,
            }, false)
            return
          }
        }
      }
    } catch {
      // 详情加载失败按库级降级，下次进入再校验
    }
    if (syncEpoch.current !== epoch) return
    applyScope(libraryScopeOf(library), false)
  }, [applyScope])

  const loadInitialData = useCallback(() => {
    return listQuizLibraries().then(libraries => {
      setQuizLibraries(libraries)
      quizLibrariesRef.current = libraries
      librariesLoadedRef.current = true
      return syncScope(libraries, true)
    }).catch(() => {
      // 无权益时服务端返回空目录；加载失败保持题库区域为空。
    })
  }, [syncScope])

  useEffect(() => { void loadInitialData() }, [loadInitialData])

  // 从题库列表页/练习页返回时，同步可能更新的记忆态
  useDidShow(() => {
    if (librariesLoadedRef.current) void syncScope(quizLibrariesRef.current, true)
  })

  useEffect(() => {
    if (!selectedScope || !isLoggedIn) {
      setQuizStats(null)
      return
    }
    setQuizStats(null)
    let active = true
    const session = getAuthSessionId()
    getQuizStats({ scope_type: selectedScope.type, scope_id: selectedScope.id })
      .then(stats => {
        if (active && getToken() && getAuthSessionId() === session) setQuizStats(stats)
      })
      .catch(() => {
        if (active) setQuizStats(null)
      })
    return () => { active = false }
  }, [selectedScope?.id, selectedScope?.type, isLoggedIn, sessionId])

  const handleOpenLibraries = useCallback(() => {
    void Taro.navigateTo({ url: `/${ROUTES.QUIZ_LIBRARIES}` })
  }, [])

  const handleStartPractice = useCallback(() => {
    if (!selectedScope) return
    rememberScope(selectedScope)
    void navigateWithLogin(
      `/${ROUTES.QUIZ_PREPARE}?scopeType=${selectedScope.type}&scopeId=${selectedScope.id}&scopeName=${encodeURIComponent(selectedScope.name)}`,
    )
  }, [selectedScope])

  const handleQuickActionClick = useCallback((item: QuickAction) => {
    void navigateWithLogin(`/${item.route}`)
  }, [])

  const renderQuizTab = () => (
    <View>
      <View className={styles.practiceLayout}>
        {quizLibraries.length === 0 ? (
          <View className={styles.emptyCard}>
            <Image className={styles.emptyIllustration} src={EMPTY_STATE_ILLUSTRATION} mode='aspectFit' />
            <Text className={styles.emptyTitle}>题库筹备中</Text>
            <Text className={styles.emptyDesc}>题库上架后即可在这里选择练习范围</Text>
          </View>
        ) : (
          <View className={styles.practiceCard}>
            <View className={styles.scopeSelector} onClick={handleOpenLibraries}>
              <View className={styles.scopeInfo}>
                <Text className={styles.scopeLabel}>练习范围</Text>
                <Text className={styles.scopeTitle}>
                  {selectedScope ? selectedScope.name : '选择厂商与题库'}
                </Text>
                <Text className={styles.scopeHint}>
                  {selectedScope ? `${selectedScope.libraryName} · 点击更换题库` : '按厂商浏览题库列表'}
                </Text>
              </View>
              <Icon name='chevron-right' size={18} color='#94A3B8' />
            </View>

            <View className={styles.statsGrid}>
              <View className={styles.statsItem}>
                <Text className={styles.statsValue}>{selectedScope?.questionCount ?? '-'}</Text>
                <Text className={styles.statsLabel}>全部题量</Text>
              </View>
              <View className={styles.statsItem}>
                <Text className={styles.statsValue}>
                  {quizStats ? quizStats.practice.answered_questions : '-'}
                </Text>
                <Text className={styles.statsLabel}>已答题目</Text>
              </View>
              <View className={styles.statsItem}>
                <Text className={styles.statsValue}>
                  {quizStats ? `${quizStats.practice.accuracy}%` : '-'}
                </Text>
                <Text className={styles.statsLabel}>首答正确率</Text>
              </View>
            </View>

            <View
              className={`${styles.practiceCta} ${selectedScope ? '' : styles.practiceCtaDisabled}`}
              onClick={handleStartPractice}
            >
              <Text className={styles.practiceCtaText}>开始练习</Text>
            </View>
          </View>
        )}

        <View className={styles.quickGrid}>
          {QUICK_ACTIONS.map(action => (
            <View
              key={action.route}
              className={styles.quickItem}
              onClick={() => handleQuickActionClick(action)}
            >
              <View
                className={styles.quickIconWrap}
                style={{ background: action.iconBg }}
              >
                <Icon name={action.icon} size={24} color={action.iconColor} />
              </View>
              <Text className={styles.quickLabel}>{action.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )

  return (
    <View className={styles.page}>
      <>
        <PageHeader title={STRINGS.STUDY_TITLE} shouldShowBack={false} />
        <RefreshableScrollView className={styles.body} onRefresh={loadInitialData}>
          {renderQuizTab()}
        </RefreshableScrollView>
      </>
      <CustomTabBar activeTabKey='pages/training/index' onSwitch={(url: string) => Taro.switchTab({ url })} />
    </View>
  )
}
