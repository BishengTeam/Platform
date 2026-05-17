import { useState, useRef } from 'react'
import { View, ScrollView, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Icon } from '@/components/Icon'
import { ChatArea } from '@/components/ChatArea'
import { ChatInput } from '@/components/ChatInput'
import { STRINGS } from '@/constants/strings'
import { ZONE_ROUTES } from '@/constants/routes'
import { getInitialMessages, getQuickQuestions } from '@/services/dataService'
import type { Message } from '@/types'
import styles from './index.module.scss'

function matchAny(text: string, keywords: readonly string[]): boolean {
  return keywords.some(kw => text.includes(kw))
}

function buildAiResponse(id: number, query: string): Message {
  if (matchAny(query, ['老师', '讲师', '联系方式'])) {
    return {
      id,
      type: 'ai',
      text: STRINGS.INDEX_AI_TEACHER,
      card: {
        type: 'teacher',
        name: STRINGS.AI_TEACHER_NAME,
        title: STRINGS.AI_TEACHER_TITLE,
        wechat: STRINGS.AI_TEACHER_WECHAT,
        phone: STRINGS.AI_TEACHER_PHONE,
      },
    }
  }

  if (matchAny(query, ['认证', '报名', '考试', '费用', '考点', 'H3CNE'])) {
    return {
      id,
      type: 'ai',
      text: STRINGS.INDEX_AI_EXAM,
      card: {
        type: 'exam',
        title: STRINGS.AI_EXAM_CARD_TITLE,
        description: STRINGS.AI_EXAM_CARD_DESC,
        price: '¥1,200',
        tag: STRINGS.AI_EXAM_CARD_TAG,
      },
    }
  }

  if (matchAny(query, ['就业', '工作', '招聘', '实习', '岗位'])) {
    return {
      id,
      type: 'ai',
      text: STRINGS.INDEX_AI_EMPLOYMENT,
      card: {
        type: 'zone_link',
        zoneName: STRINGS.AI_EMPLOYMENT_CARD_NAME,
        zoneKey: STRINGS.ZONE_NAMES[4],
        description: STRINGS.AI_EMPLOYMENT_CARD_DESC,
      },
    }
  }

  if (matchAny(query, ['竞赛', '比赛', '大赛'])) {
    return {
      id,
      type: 'ai',
      text: STRINGS.INDEX_AI_COMPETITION,
      card: {
        type: 'zone_link',
        zoneName: STRINGS.AI_COMPETITION_CARD_NAME,
        zoneKey: STRINGS.ZONE_NAMES[2],
        description: STRINGS.AI_COMPETITION_CARD_DESC,
      },
    }
  }

  if (matchAny(query, ['活动', '讲座', '直播'])) {
    return {
      id,
      type: 'ai',
      text: STRINGS.INDEX_AI_ACTIVITY,
      card: {
        type: 'zone_link',
        zoneName: STRINGS.AI_ACTIVITY_CARD_NAME,
        zoneKey: STRINGS.ZONE_NAMES[3],
        description: STRINGS.AI_ACTIVITY_CARD_DESC,
      },
    }
  }

  if (matchAny(query, ['课程', '学习', '培训', '资料', '教学', '推荐'])) {
    return {
      id,
      type: 'ai',
      text: STRINGS.INDEX_AI_COURSE,
      card: {
        type: 'course',
        title: STRINGS.AI_COURSE_CARD_TITLE,
        description: STRINGS.AI_COURSE_CARD_DESC,
        duration: STRINGS.AI_COURSE_CARD_DURATION,
        tag: STRINGS.AI_COURSE_CARD_TAG,
      },
    }
  }

  return { id, type: 'ai', text: STRINGS.INDEX_AI_DEFAULT }
}

export default function AiConsultPage() {
  const [messages, setMessages] = useState<Message[]>(getInitialMessages())
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const nextIdRef = useRef(100)

  const handleSend = (text?: string) => {
    const query = (text ?? inputValue).trim()
    if (!query) return

    const userMsg: Message = { id: nextIdRef.current++, type: 'user', text: query }
    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    setIsTyping(true)

    setTimeout(() => {
      setIsTyping(false)
      const aiMsg = buildAiResponse(nextIdRef.current++, query)
      setMessages(prev => [...prev, aiMsg])
    }, 1500)
  }

  const handleCardTap = (zoneKey: string) => {
    const route = ZONE_ROUTES[zoneKey]
    if (route) Taro.navigateTo({ url: route })
  }

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.headerTop}>
          <View className={styles.backBtn} onClick={() => Taro.navigateBack()}>
            <Icon name='chevron-left' size={20} color='#ffffff' />
          </View>
          <Text className={styles.headerTitle}>{STRINGS.AI_CONSULT_HEADER_TITLE}</Text>
          <View className={styles.headerRight} />
        </View>
      </View>

      <ScrollView className={styles.body} scrollY scrollWithAnimation>
        <ChatArea messages={messages} isTyping={isTyping} onCardTap={handleCardTap} />
        <View className={styles.bottomPad} />
      </ScrollView>

      <View className={styles.inputArea}>
        <ChatInput
          value={inputValue}
          shouldShowQuickQuestions
          quickQuestions={getQuickQuestions()}
          onInput={setInputValue}
          onSend={() => handleSend()}
          onQuickTap={(q) => handleSend(q)}
        />
      </View>
    </View>
  )
}
