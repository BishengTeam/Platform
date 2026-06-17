import { useState, useMemo, useCallback, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { TagFilter } from '@/components/TagFilter'
import { ZoneCard } from '@/components/ZoneCard'
import { QuizBottomNav } from '@/components/QuizBottomNav'
import { CustomTabBar } from '@/components/TabBar'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import type { QuizBottomItem } from '@/constants/quiz'
import { getCourseList, getQuizCategoryTree, getQuizProgress } from '@/services/dataService'
import { formatPrice } from '@/utils/format'
import type { CourseBrief, QuizCategory, QuizStats } from '@/types'
import type { TagFilterItem } from '@/types/registration'
import styles from './index.module.scss'

const MAIN_TABS = [STRINGS.TRAINING_TAB_COURSE, STRINGS.TRAINING_TAB_QUIZ]

// 标签颜色循环池，供动态分类标签复用
const TAG_COLORS: Omit<TagFilterItem, 'label'>[] = [
  { activeColor: '#1677FF', activeBg: '#1677FF', activeText: '#ffffff', inactiveBg: '#F0F5FF' },
  { activeColor: '#52C41A', activeBg: '#52C41A', activeText: '#ffffff', inactiveBg: '#F6FFED' },
  { activeColor: '#FA8C16', activeBg: '#FA8C16', activeText: '#ffffff', inactiveBg: '#FFF7E6' },
  { activeColor: '#722ED1', activeBg: '#722ED1', activeText: '#ffffff', inactiveBg: '#F9F0FF' },
  { activeColor: '#13C2C2', activeBg: '#13C2C2', activeText: '#ffffff', inactiveBg: '#E6FFFB' },
  { activeColor: '#FF4D4F', activeBg: '#FF4D4F', activeText: '#ffffff', inactiveBg: '#FFF1F0' },
]

const TRAINING_QUIZ_BOTTOM: QuizBottomItem[] = [
  { label: '模拟考试', icon: '📋', route: ROUTES.QUIZ_MOCK },
  { label: '错题', icon: '📕', route: ROUTES.QUIZ_WRONG_BOOK },
  { label: '收藏', icon: '⭐', route: ROUTES.QUIZ_COLLECTIONS },
]

export default function TrainingPage() {
  const [mainTab, setMainTab] = useState<string>(MAIN_TABS[0])
  const [techTag, setTechTag] = useState(STRINGS.STUDY_TAG_ALL)

  const [allCourses, setAllCourses] = useState<CourseBrief[]>([])
  const [quizCategories, setQuizCategories] = useState<QuizCategory[]>([])
  const [quizTree, setQuizTree] = useState<QuizCategory[]>([])
  const [selectedQuizId, setSelectedQuizId] = useState('')
  const [quizStats, setQuizStats] = useState<QuizStats | null>(null)

  useEffect(() => {
    getCourseList().then((data) => {
      setAllCourses(data)
    }).catch((err) => {
      // 课程数据加载失败静默处理
    })
    getQuizCategoryTree().then((tree) => {
      setQuizTree(tree)
      // 从树中提取平铺列表，用于 selectedQuiz 查找
      const flat: QuizCategory[] = []
      const walk = (nodes: QuizCategory[]) => {
        for (const n of nodes) {
          flat.push(n)
          if (n.children) walk(n.children)
        }
      }
      walk(tree)
      setQuizCategories(flat)
      setSelectedQuizId(flat[0]?.id || '')
    }).catch((err) => {
      // 题库分类加载失败静默处理
    })
  }, [])

  // 切换题库分类时重新获取统计数据
  useEffect(() => {
    if (!selectedQuizId) return
    getQuizProgress(selectedQuizId).then((stats) => {
      setQuizStats(stats)
    }).catch(() => {})
  }, [selectedQuizId])

  // 英文 category → 中文标签映射（对齐认证页 VENDOR_DISPLAY_MAP 风格）
  const CATEGORY_DISPLAY_MAP: Record<string, string> = {
    basic: STRINGS.STUDY_TAG_BASIC,
    advanced: STRINGS.STUDY_TAG_ADVANCED,
    practical: STRINGS.STUDY_TAG_PRACTICAL,
    certification: STRINGS.STUDY_TAG_CERTIFICATION,
  }
  // 中文标签 → 英文 category 反向映射
  const labelCategoryMap: Record<string, string> = Object.fromEntries(
    Object.entries(CATEGORY_DISPLAY_MAP).map(([k, v]) => [v, k]),
  )

  // 从课程数据动态提取分类标签：从 CourseBrief.category 去重后映射为 TagFilterItem
  const courseTags = useMemo<TagFilterItem[]>(() => {
    const categories = [...new Set(allCourses.map(c => c.category).filter(Boolean))]
    return [
      { label: STRINGS.STUDY_TAG_ALL, activeColor: '#1677FF', activeBg: '#1677FF', activeText: '#ffffff', inactiveBg: '#F0F5FF' },
      ...categories.map((cat, i) => ({
        label: CATEGORY_DISPLAY_MAP[cat] || cat,
        ...TAG_COLORS[i % TAG_COLORS.length],
      })),
    ]
  }, [allCourses])

  const selectedQuiz = quizCategories.find(q => q.id === selectedQuizId) || quizCategories[0]

  const techCourses = useMemo(() => {
    if (techTag === STRINGS.STUDY_TAG_ALL) return allCourses
    const eng = labelCategoryMap[techTag] || techTag
    return allCourses.filter(c => c.category === eng)
  }, [techTag, allCourses])

  const handleQuizSelect = useCallback(() => {
    const parents = quizTree
    if (!parents.length) return
    Taro.showActionSheet({
      itemList: parents.map(p => p.name),
      success: (res1) => {
        const parent = parents[res1.tapIndex]
        if (!parent) return
        // 无子分类 → 直接选中叶子节点
        if (!parent.children?.length) {
          setSelectedQuizId(parent.id)
          return
        }
        // 有子分类 → 弹出第二级；取消则默认选中父分类
        Taro.showActionSheet({
          itemList: parent.children.map(c => c.name),
          success: (res2) => {
            const child = parent.children[res2.tapIndex]
            if (child) setSelectedQuizId(child.id)
          },
          fail: () => {
            setSelectedQuizId(parent.id)
          },
        })
      },
      fail: () => {
        // 用户取消选择，不做任何操作
      },
    })
  }, [quizTree])

  const handleQuizBottomNav = useCallback((item: QuizBottomItem) => {
    Taro.navigateTo({ url: `/${item.route}` })
  }, [])

  const renderTechTab = () => (
    <View>
      <View className={styles.filterRow}>
        <TagFilter tags={courseTags} activeTag={techTag} onChange={setTechTag} className={styles.tagSm} />
      </View>
      <View className={styles.cardList}>
        {techCourses.map(course => (
          <ZoneCard
            key={course.id}
            title={course.title}
            subtitle={[course.teacher_name && `${STRINGS.COURSE_INSTRUCTOR}: ${course.teacher_name}`, course.description].filter(Boolean).join(' | ') || undefined}
            tags={course.category ? [course.category] : []}
            price={course.price === 0 ? STRINGS.ORDERS_FREE : formatPrice(course.price)}
            buttonText={STRINGS.STUDY_ENROLL}
            buttonColor='#52C41A'
            onButtonClick={() => Taro.navigateTo({ url: `/pages/course/detail?id=${course.id}` })}  // eslint-disable-line @typescript-eslint/restrict-template-expressions
          />
        ))}
      </View>
    </View>
  )

  const renderQuizTab = () => (
    <View>
      <View className={styles.quizSelector} onClick={handleQuizSelect}>
        <View className={styles.quizSelectorInfo}>
          <Text className={styles.quizSelectorTitle}>{selectedQuiz?.name || '请选择题库'}</Text>
          <Text className={styles.quizSelectorHint}>点击可选择/切换题库</Text>
        </View>
        <Text className={styles.quizSelectorArrow}>▼</Text>
      </View>

      <View className={styles.statsCard}>
        <View className={styles.statsRow}>
          <View className={styles.statsItem}>
            <Text className={styles.statsValue}>
              {(() => {
                const total = quizStats?.totalQuestions || selectedQuiz?.questionCount || 0
                const done = quizStats?.answeredQuestions ?? 0
                return quizStats ? total - done : '-'
              })()}
            </Text>
            <Text className={styles.statsLabel}>未做题</Text>
          </View>
          <View className={styles.statsItem}>
            <Text className={styles.statsValue}>
              {quizStats ? (quizStats.answeredQuestions ?? 0) : '-'}
            </Text>
            <Text className={styles.statsLabel}>已做题</Text>
          </View>
          <View className={styles.statsItem}>
            <Text className={styles.statsValue}>
              {quizStats ? `${quizStats.accuracy ?? 0}%` : '-'}
            </Text>
            <Text className={styles.statsLabel}>正确率</Text>
          </View>
        </View>
        <View className={styles.statsCta} onClick={() => Taro.navigateTo({ url: `/${ROUTES.QUIZ_PRACTICE}?categoryId=${selectedQuizId}` })}>
          <Text className={styles.statsCtaText}>开始练习</Text>
        </View>
      </View>

      <QuizBottomNav items={TRAINING_QUIZ_BOTTOM} onItemClick={handleQuizBottomNav} />
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
          {mainTab === MAIN_TABS[0] && renderTechTab()}
          {mainTab === MAIN_TABS[1] && renderQuizTab()}
        </ScrollView>
      </AuthGuard>
      <CustomTabBar activeTabKey='pages/training/index' onSwitch={(url: string) => Taro.switchTab({ url })} />
    </View>
  )
}