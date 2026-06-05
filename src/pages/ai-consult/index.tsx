import { useState, useRef, useCallback, useEffect } from 'react'
import { View, ScrollView, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Icon } from '@/components/Icon'
import { ChatArea } from '@/components/ChatArea'
import { ChatInput } from '@/components/ChatInput'
import { FloatingService } from '@/components/FloatingService'
import { STRINGS } from '@/constants/strings'
import { ROUTES, ZONE_ROUTES } from '@/constants/routes'
import {
  KEYWORD_TEACHER, KEYWORD_EXAM, KEYWORD_EMPLOYMENT,
  KEYWORD_COMPETITION, KEYWORD_ACTIVITY, KEYWORD_COURSE,
} from '@/constants/keywords'
import { getInitialMessages, fetchQuickQuestions } from '@/services/dataService'
import { sendChatMessage } from '@/services/dataService'
import type { Message } from '@/types'
import styles from './index.module.scss'

type Intent = 'teacher' | 'exam' | 'employment' | 'competition' | 'activity' | 'course'

const INTENT_RULES: { intent: Intent; keywords: readonly string[] }[] = [
  { intent: 'teacher', keywords: KEYWORD_TEACHER },
  { intent: 'exam', keywords: KEYWORD_EXAM },
  { intent: 'employment', keywords: KEYWORD_EMPLOYMENT },
  { intent: 'competition', keywords: KEYWORD_COMPETITION },
  { intent: 'activity', keywords: KEYWORD_ACTIVITY },
  { intent: 'course', keywords: KEYWORD_COURSE },
]

function detectIntent(query: string): Intent | null {
  for (const rule of INTENT_RULES) {
    if (rule.keywords.some(kw => query.includes(kw))) {
      return rule.intent
    }
  }
  return null
}

const RESPONSE_BUILDERS: Record<Intent, (id: number) => Message> = {
  teacher: (id) => ({
    id, type: 'ai', text: STRINGS.INDEX_AI_TEACHER,
    card: { type: 'teacher', name: STRINGS.AI_TEACHER_NAME, title: STRINGS.AI_TEACHER_TITLE, wechat: STRINGS.AI_TEACHER_WECHAT, phone: STRINGS.AI_TEACHER_PHONE },
  }),
  exam: (id) => ({
    id, type: 'ai', text: STRINGS.INDEX_AI_EXAM,
    card: { type: 'exam', title: STRINGS.AI_EXAM_CARD_TITLE, description: STRINGS.AI_EXAM_CARD_DESC, price: '¥1,200', tag: STRINGS.AI_EXAM_CARD_TAG },
  }),
  employment: (id) => ({
    id, type: 'ai', text: STRINGS.INDEX_AI_EMPLOYMENT,
    card: { type: 'zone_link', zoneName: STRINGS.AI_EMPLOYMENT_CARD_NAME, zoneKey: 'job', description: STRINGS.AI_EMPLOYMENT_CARD_DESC },
  }),
  competition: (id) => ({
    id, type: 'ai', text: STRINGS.INDEX_AI_COMPETITION,
    card: { type: 'zone_link', zoneName: STRINGS.AI_COMPETITION_CARD_NAME, zoneKey: 'compete', description: STRINGS.AI_COMPETITION_CARD_DESC },
  }),
  activity: (id) => ({
    id, type: 'ai', text: STRINGS.INDEX_AI_ACTIVITY,
    card: { type: 'zone_link', zoneName: STRINGS.AI_ACTIVITY_CARD_NAME, zoneKey: 'activity', description: STRINGS.AI_ACTIVITY_CARD_DESC },
  }),
  course: (id) => ({
    id, type: 'ai', text: STRINGS.INDEX_AI_COURSE,
    card: { type: 'course', title: STRINGS.AI_COURSE_CARD_TITLE, description: STRINGS.AI_COURSE_CARD_DESC, duration: STRINGS.AI_COURSE_CARD_DURATION, tag: STRINGS.AI_COURSE_CARD_TAG },
  }),
}

function buildAiResponse(id: number, query: string): Message {
  // Fallback when API returns empty or USE_MOCK: keyword-based intent matching
  const intent = detectIntent(query)
  if (intent) return RESPONSE_BUILDERS[intent](id) 
  return { id, type: 'ai', text: STRINGS.INDEX_AI_DEFAULT }
}

export default function AiConsultPage() {
  const [messages, setMessages] = useState<Message[]>(getInitialMessages())
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [quickQuestions, setQuickQuestions] = useState<string[]>([])
  const nextIdRef = useRef(100)

  useEffect(() => {
    fetchQuickQuestions().then(setQuickQuestions).catch(() => setQuickQuestions([]))
  }, [])

  const handleSend = useCallback(async (text?: string) => {
    const query = (text ?? inputValue).trim()
    if (!query) return

    const userMsg: Message = { id: nextIdRef.current++, type: 'user', text: query }
    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    setIsTyping(true)

    try {
      const { reply } = await sendChatMessage(query)
      setIsTyping(false)
      // Fallback to RESPONSE_BUILDERS when API returns empty or USE_MOCK generic reply
      if (!reply || reply === '收到您的消息，AI 助手正在处理中...') {
        const aiMsg = buildAiResponse(nextIdRef.current++, query)
        setMessages(prev => [...prev, aiMsg])
      } else {
        const aiMsg: Message = { id: nextIdRef.current++, type: 'ai', text: reply }
        setMessages(prev => [...prev, aiMsg])
      }
    } catch {
      setIsTyping(false)
      const aiMsg = buildAiResponse(nextIdRef.current++, query) 
      setMessages(prev => [...prev, aiMsg])
    }
  }, [inputValue])

  const handleSendEmpty = useCallback(() => handleSend(), [handleSend])
  const handleQuickTap = useCallback((q: string) => handleSend(q), [handleSend])
  const handleBack = useCallback(() => Taro.navigateBack(), [])

  const handleCardTap = useCallback((zoneKey: string) => {
    const route = ZONE_ROUTES[zoneKey]
    if (route) Taro.navigateTo({ url: route })
  }, [])

  const handleGoService = useCallback(() => {
    Taro.navigateTo({ url: `/${ROUTES.SERVICE}` })
  }, [])

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.headerTop}>
          <View className={styles.backBtn} onClick={handleBack}>
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
          quickQuestions={quickQuestions}
          onInput={setInputValue}
          onSend={handleSendEmpty}
          onQuickTap={handleQuickTap}
        />
      </View>

      <FloatingService onPress={handleGoService} />
    </View>
  )
}