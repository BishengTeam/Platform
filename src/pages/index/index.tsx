import { useState } from 'react'
import { View, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { ChatArea } from '@/components/ChatArea'
import { ChatInput } from '@/components/ChatInput'
import { FloatingService } from '@/components/FloatingService'
import { PageHeader } from '@/components/PageHeader'
import TabBar from '@/components/TabBar'
import { WelcomeCard } from '@/components/WelcomeCard'
import { STRINGS } from '@/constants/strings'
import { ZONE_ROUTES } from '@/constants/routes'
import { getInitialMessages } from '@/services/dataService'
import type { Message } from '@/types'
import styles from './index.module.scss'

let nextId = 100

function matchAny(text: string, keywords: string[]): boolean {
  return keywords.some(kw => text.includes(kw))
}

function buildAiResponse(id: number, query: string): Message {
  // Teacher contact
  if (matchAny(query, ['老师', '讲师', '联系方式'])) {
    return {
      id,
      type: 'ai',
      text: STRINGS.INDEX_AI_TEACHER,
      card: {
        type: 'teacher',
        name: '张老师',
        title: 'H3CNE 金牌讲师 / 考官',
        wechat: 'H3C_TeacherZhang',
        phone: '138-1234-5678',
      },
    }
  }

  // Exam / registration
  if (matchAny(query, ['认证', '报名', '考试', '费用', '考点', 'H3CNE'])) {
    return {
      id,
      type: 'ai',
      text: STRINGS.INDEX_AI_EXAM,
      card: {
        type: 'exam',
        title: 'H3CNE-RS 路由交换认证',
        description: '新华三认证网络工程师，企业网络构建与管理',
        price: '¥1,200',
        tag: '新华三',
      },
    }
  }

  // Course / study
  if (matchAny(query, ['课程', '学习', '培训', '资料', '教学', '推荐'])) {
    return {
      id,
      type: 'ai',
      text: STRINGS.INDEX_AI_COURSE,
      card: {
        type: 'course',
        title: 'H3CNE 网络基础精讲',
        description: '从零基础到认证通关，含实验实操',
        duration: '48课时',
        tag: '基础课程',
      },
    }
  }

  // Competition
  if (matchAny(query, ['竞赛', '比赛', '大赛'])) {
    return {
      id,
      type: 'ai',
      text: STRINGS.INDEX_AI_COMPETITION,
      card: {
        type: 'zone_link',
        zoneName: '竞赛专区',
        zoneKey: '竞赛专区',
        description: '3个进行中 · 2个即将开始',
      },
    }
  }

  // Activity
  if (matchAny(query, ['活动', '讲座', '直播'])) {
    return {
      id,
      type: 'ai',
      text: STRINGS.INDEX_AI_ACTIVITY,
      card: {
        type: 'zone_link',
        zoneName: '活动专区',
        zoneKey: '活动专区',
        description: '线上线下活动等你参与',
      },
    }
  }

  // Employment
  if (matchAny(query, ['就业', '工作', '招聘', '实习', '岗位'])) {
    return {
      id,
      type: 'ai',
      text: STRINGS.INDEX_AI_EMPLOYMENT,
      card: {
        type: 'zone_link',
        zoneName: '就业专区',
        zoneKey: '就业专区',
        description: '热门网络工程师岗位推荐',
      },
    }
  }

  // Default
  return { id, type: 'ai', text: STRINGS.INDEX_AI_DEFAULT }
}

export default function IndexPage() {
  const [messages, setMessages] = useState<Message[]>(getInitialMessages())
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const handleSend = (text?: string) => {
    const query = (text ?? inputValue).trim()
    if (!query) return

    const userMsg: Message = { id: nextId++, type: 'user', text: query }
    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    setIsTyping(true)

    setTimeout(() => {
      setIsTyping(false)
      const aiMsg = buildAiResponse(nextId++, query)
      setMessages(prev => [...prev, aiMsg])
    }, 1500)
  }

  const handleCardTap = (zoneKey: string) => {
    const route = ZONE_ROUTES[zoneKey]
    if (route) Taro.navigateTo({ url: route })
  }

  return (
    <AuthGuard>
    <View className={styles.page}>
      <PageHeader title={STRINGS.INDEX_NAV_TITLE} />

      <ScrollView className={styles.body} scrollY scrollWithAnimation>
        {messages.length === 1 &&
          <WelcomeCard />
        }

        <ChatArea messages={messages} isTyping={isTyping} onCardTap={handleCardTap} />
      </ScrollView>

      <View className={styles.inputArea}>
        <FloatingService />
        <ChatInput
          value={inputValue}
          showQuickQuestions
          onInput={setInputValue}
          onSend={() => handleSend()}
          onQuickTap={(q) => handleSend(q)}
        />
      </View>
      <TabBar />
    </View>
    </AuthGuard>
  )
}
