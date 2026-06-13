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
import { getCourseList, getQuizCategories } from '@/services/dataService'
import type { CourseBrief } from '@/types'
import type { QuizCategory } from '@/types'
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
  const [techTag, setTechTag] = useState('全部')

  const [allCourses, setAllCourses] = useState<CourseBrief[]>([])
  const [quizCategories, setQuizCategories] = useState<QuizCategory[]>([])
  const [selectedQuizId, setSelectedQuizId] = useState('')

  useEffect(() => {
    getCourseList().then((data) => {
      setAllCourses(data)
    }).catch((err) => {
      console.error('[TrainingPage] 课程数据加载失败:', err)
    })
    getQuizCategories().then((cats) => {
      setQuizCategories(cats)
      setSelectedQuizId(cats[0]?.id || '')
    }).catch((err) => {
      console.error('[TrainingPage] 题库分类加载失败:', err)
    })
  }, [])

  // 从课程数据动态提取分类标签：从 CourseBrief.category 去重后映射为 TagFilterItem
  const courseTags = useMemo<TagFilterItem[]>(() => {
    const categories = [...new Set(allCourses.map(c => c.category).filter(Boolean))]
    return [
      { label: '全部', activeColor: '#1677FF', activeBg: '#1677FF', activeText: '#ffffff', inactiveBg: '#F0F5FF' },
      ...categories.map((cat, i) => ({
        label: cat,
        ...TAG_COLORS[i % TAG_COLORS.length],
      })),
    ]
  }, [allCourses])

  const selectedQuiz = quizCategories.find(q => q.id === selectedQuizId) || quizCategories[0]

  const techCourses = useMemo(() => {
    if (techTag === '全部') return allCourses
    return allCourses.filter(c => c.category === techTag)
  }, [techTag, allCourses])

  const handleQuizSelect = useCallback(() => {
    Taro.showActionSheet({
      itemList: quizCategories.map(q => q.name),
      success: (res) => {
        const quiz = quizCategories[res.tapIndex]
        if (quiz) setSelectedQuizId(quiz.id)
      },
    })
  }, [quizCategories])

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
            subtitle={course.teacher_name || course.description || ''}
            tags={[course.category]}
            price={String(course.price) === '0' || course.price === 0 ? STRINGS.ORDERS_FREE : `¥${course.price}`}
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
            <Text className={styles.statsValue}>200</Text>
            <Text className={styles.statsLabel}>未做题</Text>
          </View>
          <View className={styles.statsItem}>
            <Text className={styles.statsValue}>0</Text>
            <Text className={styles.statsLabel}>已做题</Text>
          </View>
          <View className={styles.statsItem}>
            <Text className={styles.statsValue}>0%</Text>
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