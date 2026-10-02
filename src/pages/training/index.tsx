import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { View, Text, ScrollView, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { TagFilter } from '@/components/TagFilter'
import { Icon } from '@/components/Icon'
import { QuizCategoryPicker } from '@/components/QuizCategoryPicker'
import { CustomTabBar } from '@/components/TabBar'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import { toBase64 } from '@/utils/base64'
import { getCourseList, getQuizLibrary, getQuizStats, listQuizLibraries } from '@/services/dataService'
import { formatPrice, formatCategory, CATEGORY_LABEL_MAP } from '@/utils/format'
import type { CourseBrief } from '@/types'
import type { QuizLibraryCatalogDetail, QuizLibraryCatalogItem, QuizPracticeScopeType, QuizStats, QuizVendorTag } from '@/contracts/quiz'
import styles from './index.module.scss'

// 在线课程暂时隐藏，只显示练习助手
const MAIN_TABS = [STRINGS.TRAINING_TAB_QUIZ]

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

// 题库厂商筛选：默认 H3C；none 归入「其他」，保证四个页签覆盖全部题库。
const VENDOR_TABS: Array<{ tag: QuizVendorTag; label: string; logo?: string }> = [
  { tag: 'h3c', label: 'H3C', logo: '/assets/vendor/h3c.png' },
  { tag: 'nisp', label: 'NISP', logo: '/assets/vendor/nisp.png' },
  { tag: 'sangfor', label: '深信服', logo: '/assets/vendor/sangfor.png' },
  { tag: 'none', label: '其他' },
]

const DEFAULT_VENDOR_TAG: QuizVendorTag = 'h3c'

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

interface TrainingScope {
  type: QuizPracticeScopeType
  id: number
  name: string
  questionCount: number
}

interface TrainingScopePickerNode extends TrainingScope {
  question_count: number
  children: TrainingScopePickerNode[]
}

export default function TrainingPage() {
  const [mainTab, setMainTab] = useState<string>(MAIN_TABS[0])
  const [techTag, setTechTag] = useState<string>(STRINGS.STUDY_TAG_ALL)

  const [allCourses, setAllCourses] = useState<CourseBrief[]>([])
  const [failedCovers, setFailedCovers] = useState<Set<number>>(new Set())
  const [quizLibraries, setQuizLibraries] = useState<QuizLibraryCatalogItem[]>([])
  const [activeVendor, setActiveVendor] = useState<QuizVendorTag>(DEFAULT_VENDOR_TAG)
  const [selectedLibrary, setSelectedLibrary] = useState<QuizLibraryCatalogDetail | null>(null)
  const [selectedScope, setSelectedScope] = useState<TrainingScope | null>(null)
  const [scopePickerVisible, setScopePickerVisible] = useState(false)
  const [quizStats, setQuizStats] = useState<QuizStats | null>(null)
  // 厂商切换会连发题库详情请求，用递增序号丢弃过期响应，避免快照回写。
  const librarySelectionEpoch = useRef(0)

  const selectFirstLibrary = useCallback((libraries: QuizLibraryCatalogItem[]) => {
    const epoch = ++librarySelectionEpoch.current
    const first = libraries[0]
    if (!first) {
      setSelectedLibrary(null)
      setSelectedScope(null)
      return
    }
    getQuizLibrary(first.id).then(detail => {
      if (librarySelectionEpoch.current !== epoch) return
      setSelectedLibrary(detail)
      setSelectedScope({ type: 'library', id: detail.id, name: detail.name, questionCount: detail.question_count })
    }).catch(() => {
      if (librarySelectionEpoch.current !== epoch) return
      Taro.showToast({ title: '题库目录加载失败', icon: 'none' })
    })
  }, [])

  useEffect(() => {
    getCourseList().then((data) => {
      setAllCourses(data)
    }).catch(() => {
      // 课程数据加载失败静默处理
    })
    listQuizLibraries().then((libraries) => {
      setQuizLibraries(libraries)
      selectFirstLibrary(libraries.filter(item => item.vendor_tag === DEFAULT_VENDOR_TAG))
    }).catch(() => {
      // 无权益时服务端返回空目录；加载失败保持题库区域为空。
    })
  }, [])

  useEffect(() => {
    if (!selectedScope) {
      setQuizStats(null)
      return
    }
    setQuizStats(null)
    let active = true
    getQuizStats({ scope_type: selectedScope.type, scope_id: selectedScope.id })
      .then(stats => {
        if (active) setQuizStats(stats)
      })
      .catch(() => {
        if (active) setQuizStats(null)
      })
    return () => { active = false }
  }, [selectedScope?.id, selectedScope?.type])


  // 从课程数据动态提取分类标签，统一使用品牌蓝/灰配色
  const courseTags = useMemo(() => {
    const categories = [...new Set(allCourses.map(c => c.category).filter(Boolean))]
    const tagStyle = { activeColor: '#1677FF', activeBg: '#1677FF', activeText: '#ffffff', inactiveBg: '#F5F5F5' }
    return [
      { label: STRINGS.STUDY_TAG_ALL, ...tagStyle },
      ...categories.map((cat) => ({
        label: formatCategory(cat),
        ...tagStyle,
      })),
    ]
  }, [allCourses])

  const techCourses = useMemo(() => {
    if (techTag === STRINGS.STUDY_TAG_ALL) return allCourses
    const eng = CATEGORY_LABEL_MAP[techTag] || techTag
    const lower = eng.toLowerCase()
    return allCourses.filter(c => c.category?.toLowerCase() === lower)
  }, [techTag, allCourses])

  const vendorLibraries = useMemo(
    () => quizLibraries.filter(item => item.vendor_tag === activeVendor),
    [quizLibraries, activeVendor],
  )

  const handleVendorChange = useCallback((tag: QuizVendorTag) => {
    if (tag === activeVendor) return
    setActiveVendor(tag)
    setScopePickerVisible(false)
    selectFirstLibrary(quizLibraries.filter(item => item.vendor_tag === tag))
  }, [activeVendor, quizLibraries, selectFirstLibrary])

  const scopeTree = useMemo<TrainingScopePickerNode[]>(() => {
    if (!selectedLibrary) return []
    return [{
      type: 'library',
      id: selectedLibrary.id,
      name: selectedLibrary.name,
      questionCount: selectedLibrary.question_count,
      question_count: selectedLibrary.question_count,
      children: selectedLibrary.modules.map(module => ({
        type: 'module',
        id: module.id,
        name: module.name,
        questionCount: module.question_count,
        question_count: module.question_count,
        children: module.knowledge_points.map(point => ({
          type: 'knowledge_point',
          id: point.id,
          name: point.name,
          questionCount: point.question_count,
          question_count: point.question_count,
          children: [],
        })),
      })),
    }]
  }, [selectedLibrary])

  const openLibraryScope = useCallback((library: QuizLibraryCatalogItem) => {
    const epoch = ++librarySelectionEpoch.current
    getQuizLibrary(library.id).then(detail => {
      if (librarySelectionEpoch.current !== epoch) return
      setSelectedLibrary(detail)
      setSelectedScope({ type: 'library', id: detail.id, name: detail.name, questionCount: detail.question_count })
      setScopePickerVisible(true)
    }).catch(() => Taro.showToast({ title: '题库目录加载失败', icon: 'none' }))
  }, [])

  const handleQuizSelect = useCallback(() => {
    if (vendorLibraries.length === 0) return
    if (vendorLibraries.length === 1) {
      if (selectedLibrary?.id === vendorLibraries[0].id) setScopePickerVisible(true)
      else openLibraryScope(vendorLibraries[0])
      return
    }
    Taro.showActionSheet({
      itemList: vendorLibraries.map(item => `${item.name}（${item.question_count}题）`),
      success: result => {
        const library = vendorLibraries[result.tapIndex]
        if (!library) return
        if (selectedLibrary?.id === library.id) setScopePickerVisible(true)
        else openLibraryScope(library)
      },
    })
  }, [openLibraryScope, vendorLibraries, selectedLibrary?.id])

  const handleScopeSelect = useCallback((node: TrainingScopePickerNode) => {
    setSelectedScope({
      type: node.type,
      id: node.id,
      name: node.name,
      questionCount: node.questionCount,
    })
    setScopePickerVisible(false)
  }, [])

  const handleQuickActionClick = useCallback((item: QuickAction) => {
    Taro.navigateTo({ url: `/${item.route}` })
  }, [])

  const handleSwitchToAvailableVendor = useCallback(() => {
    const availableVendor = VENDOR_TABS.find(vendor => (
      vendor.tag !== activeVendor &&
      quizLibraries.some(library => library.vendor_tag === vendor.tag)
    ))
    if (!availableVendor) {
      Taro.showToast({ title: '其他厂商题库筹备中', icon: 'none' })
      return
    }
    handleVendorChange(availableVendor.tag)
  }, [activeVendor, handleVendorChange, quizLibraries])

  const handleCourseClick = useCallback((course: CourseBrief) => {
    Taro.navigateTo({ url: `/pages/course/detail?id=${course.id}` })
  }, [])

  const handleCoverError = useCallback((courseId: number) => {
    setFailedCovers(prev => new Set(prev).add(courseId))
  }, [])

  const renderTechTab = () => (
    <View>
      <View className={styles.filterRow}>
        <TagFilter tags={courseTags} activeTag={techTag} onChange={setTechTag} className={styles.tagSm} />
      </View>
      <View className={styles.cardList}>
        {techCourses.map(course => (
          <View
            key={course.id}
            className={styles.courseCard}
            hoverClass={styles.courseCardActive}
            onClick={() => handleCourseClick(course)}
          >
            <View className={styles.coverWrap}>
              {course.cover_url && !failedCovers.has(course.id) ? (
                <Image
                  className={styles.coverImage}
                  src={course.cover_url}
                  mode='aspectFill'
                  onError={() => handleCoverError(course.id)}
                />
              ) : (
                <View className={styles.coverPlaceholder}>
                  <Icon name='play-circle' size={32} color='#1677FF' />
                </View>
              )}
            </View>
            <View className={styles.courseInfo}>
              <View className={styles.courseHeader}>
                <Text className={styles.courseTitle}>{course.title}</Text>
                {course.category && (
                  <Text className={styles.courseTag}>{formatCategory(course.category)}</Text>
                )}
              </View>

              <Text className={styles.courseDesc}>
                {[course.teacher_name && `${STRINGS.COURSE_INSTRUCTOR}: ${course.teacher_name}`, course.description].filter(Boolean).join(' | ')}
              </Text>

              <View className={styles.courseFooter}>
                <Text className={styles.coursePrice}>
                  {course.price === 0 ? STRINGS.ORDERS_FREE : formatPrice(course.price)}
                </Text>
                <View className={styles.studyBtn}>
                  <Icon name='play-circle' size={14} color='#ffffff' />
                  <Text className={styles.studyBtnText}>{STRINGS.STUDY_ENROLL}</Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  )

  const renderQuizTab = () => (
    <View>
      <View className={styles.practiceLayout}>
        <View className={styles.vendorCard}>
          <View className={styles.vendorRow}>
            {VENDOR_TABS.map(vendor => {
              const active = vendor.tag === activeVendor
              return (
                <View
                  key={vendor.tag}
                  className={`${styles.vendorButton} ${active ? styles.vendorButtonActive : ''}`}
                  onClick={() => handleVendorChange(vendor.tag)}
                >
                  <View className={styles.vendorLogoBox}>
                    {vendor.logo
                      ? <Image className={styles.vendorLogo} src={vendor.logo} mode='aspectFit' />
                      : <Icon name='book-open' size={24} color={active ? '#165DFF' : '#8c8c8c'} />}
                  </View>
                  <Text className={active ? styles.vendorLabelActive : styles.vendorLabel}>{vendor.label}</Text>
                </View>
              )
            })}
          </View>
        </View>

        {vendorLibraries.length === 0 ? (
          <View className={styles.emptyCard}>
            <Image className={styles.emptyIllustration} src={EMPTY_STATE_ILLUSTRATION} mode='aspectFit' />
            <Text className={styles.emptyTitle}>该厂商题库筹备中</Text>
            <Text className={styles.emptyDesc}>题库上架后将展示练习范围、答题进度与正确率</Text>
            <View className={styles.emptyAction} onClick={handleSwitchToAvailableVendor}>
              <Text className={styles.emptyActionText}>切换到其他厂商</Text>
              <Icon name='chevron-right' size={14} color='#165DFF' />
            </View>
          </View>
        ) : (
          <View className={styles.practiceCard}>
            <View className={styles.scopeSelector} onClick={handleQuizSelect}>
              <View className={styles.scopeInfo}>
                <Text className={styles.scopeLabel}>练习范围</Text>
                <Text className={styles.scopeTitle}>
                  {selectedScope?.name || selectedLibrary?.name || '题库目录加载中'}
                </Text>
                <Text className={styles.scopeHint}>按题库、模块或知识点选择</Text>
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
              onClick={() => selectedScope && Taro.navigateTo({ url: `/${ROUTES.QUIZ_PREPARE}?scopeType=${selectedScope.type}&scopeId=${selectedScope.id}` })}
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
      <AuthGuard>
        <PageHeader title={STRINGS.STUDY_TITLE} shouldShowBack={false} />
        <View className={styles.tabBar}>
          <TagFilter tags={MAIN_TABS} activeTag={mainTab} onChange={setMainTab} variant='underline' />
        </View>
        <ScrollView className={styles.body} scrollY>
          {/* 在线课程暂时隐藏：唯一 tab「练习助手」必须渲染练习功能，不能落到课程列表 */}
          {mainTab === MAIN_TABS[0] && renderQuizTab()}
        </ScrollView>
      </AuthGuard>
      <CustomTabBar activeTabKey='pages/training/index' onSwitch={(url: string) => Taro.switchTab({ url })} />
      <QuizCategoryPicker
        visible={scopePickerVisible}
        tree={scopeTree}
        selectedId={selectedScope?.id ?? null}
        onSelect={handleScopeSelect}
        onClose={() => setScopePickerVisible(false)}
        title='选择练习范围'
      />
    </View>
  )
}
