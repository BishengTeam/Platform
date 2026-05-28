import { useState, useMemo, useCallback } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { TagFilter } from '@/components/TagFilter'
import { ZoneCard } from '@/components/ZoneCard'
import { CustomTabBar } from '@/components/TabBar'
import { STRINGS } from '@/constants/strings'
import { ROUTES } from '@/constants/routes'
import { getCourseList, getQuizCategories } from '@/services/dataService'
import type { TagFilterItem } from '@/types/registration'
import styles from './index.module.scss'

const MAIN_TABS = [STRINGS.TRAINING_TAB_TECH, STRINGS.TRAINING_TAB_QUIZ]

const TECH_TAGS: TagFilterItem[] = [
  { label: '全部', activeColor: '#1677FF', activeBg: '#1677FF', activeText: '#ffffff', inactiveBg: '#F0F5FF' },
  { label: STRINGS.STUDY_TAG_BASIC, activeColor: '#1677FF', activeBg: '#1677FF', activeText: '#ffffff', inactiveBg: '#E8F2FF' },
  { label: STRINGS.STUDY_TAG_ADVANCED, activeColor: '#52C41A', activeBg: '#52C41A', activeText: '#ffffff', inactiveBg: '#F6FFED' },
  { label: STRINGS.STUDY_TAG_PRACTICAL, activeColor: '#FA8C16', activeBg: '#FA8C16', activeText: '#ffffff', inactiveBg: '#FFF7E6' },
]

const QUIZ_GRID_ITEMS = [
  { label: '刷题练习', icon: '📝', route: ROUTES.QUIZ_PRACTICE },
  { label: '模拟考试', icon: '📋', route: ROUTES.QUIZ_MOCK },
  { label: '错题收藏', icon: '📕', route: ROUTES.QUIZ_WRONG_BOOK },
]

export default function TrainingPage() {
  const [mainTab, setMainTab] = useState<string>(MAIN_TABS[0])
  const [techTag, setTechTag] = useState('全部')

  const allCourses = getCourseList()
  const quizCategories = getQuizCategories()
  const [selectedQuizId, setSelectedQuizId] = useState(quizCategories[0]?.id || '')
  const selectedQuiz = quizCategories.find(q => q.id === selectedQuizId) || quizCategories[0]

  const techCourses = useMemo(() => {
    if (techTag === '全部') return allCourses
    return allCourses.filter(c => c.tag === techTag)
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

  const handleQuizGrid = useCallback((route: string) => {
    Taro.navigateTo({ url: `/${route}` })
  }, [])

  const renderTechTab = () => (
    <View>
      <View className={styles.filterRow}>
        <TagFilter tags={TECH_TAGS} activeTag={techTag} onChange={setTechTag} className={styles.tagSm} />
      </View>
      <View className={styles.cardList}>
        {techCourses.map(course => (
          <ZoneCard
            key={course.id}
            title={course.title}
            subtitle={course.desc1 || course.description}
            tags={[course.desc2 || course.duration, `${course.rating}分`]}
            price={course.price === 0 ? STRINGS.ORDERS_FREE : `¥${course.price}`}
            originalPrice={course.originalPrice > course.price ? `¥${course.originalPrice}` : undefined}
            buttonText={STRINGS.STUDY_ENROLL}
            buttonColor='#52C41A'
            onButtonClick={() => Taro.navigateTo({ url: `/pages/course/detail?id=${course.id}` })}
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
            <Text className={styles.statsValue}>0</Text>
            <Text className={styles.statsLabel}>错题</Text>
          </View>
          <View className={styles.statsItem}>
            <Text className={styles.statsValue}>0%</Text>
            <Text className={styles.statsLabel}>正确率</Text>
          </View>
        </View>
        <View className={styles.statsCta} onClick={() => handleQuizGrid(ROUTES.QUIZ_PRACTICE)}>
          <Text className={styles.statsCtaText}>开始练习</Text>
        </View>
      </View>

      <View className={styles.quizBottomRow}>
        {QUIZ_GRID_ITEMS.map(item => (
          <View key={item.route} className={styles.quizBottomItem} onClick={() => handleQuizGrid(item.route)}>
            <Text className={styles.quizBottomIcon}>{item.icon}</Text>
            <Text className={styles.quizBottomLabel}>{item.label}</Text>
          </View>
        ))}
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
          {mainTab === MAIN_TABS[0] && renderTechTab()}
          {mainTab === MAIN_TABS[1] && renderQuizTab()}
        </ScrollView>
      </AuthGuard>
      <CustomTabBar activeTabKey='pages/training/index' onSwitch={(url: string) => Taro.switchTab({ url })} />
    </View>
  )
}
