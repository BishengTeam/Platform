import { useState } from 'react'
import { View, ScrollView, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Avatar } from '@nutui/nutui-react-taro'
import { Icon } from '@/components/Icon'
import { ChatArea } from '@/components/ChatArea'
import { ChatInput } from '@/components/ChatInput'
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

  return { id, type: 'ai', text: STRINGS.INDEX_AI_DEFAULT }
}

export default function AiConsultPage() {
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
    <View className={styles.page}>
      {/* Blue header */}
      <View className={styles.header}>
        <View className={styles.headerTop}>
          <View className={styles.backBtn} onClick={() => Taro.navigateBack()}>
            <Icon name='chevron-left' size={20} color='#ffffff' />
          </View>
          <Text className={styles.headerTitle}>智小通咨询</Text>
          <View className={styles.headerRight} />
        </View>
        <View className={styles.headerInfo}>
          <View className={styles.avatarWrap}>
            <Avatar
              size='72'
              icon={<Icon name='sparkles' size={28} color='#1677FF' />}
              background='#ffffff'
            />
          </View>
          <View className={styles.headerText}>
            <Text className={styles.headerName}>智小通</Text>
            <Text className={styles.headerDesc}>您的专属 H3CNE 学习与考证助手</Text>
          </View>
        </View>
      </View>

      {/* Chat area */}
      <ScrollView className={styles.body} scrollY scrollWithAnimation>
        <View className={styles.welcome}>
          <View className={styles.welcomeBubble}>
            <Text className={styles.welcomeText}>
              {'您好!我是 H3CNE 智能助手,很高兴为您服务。\n\n我可以帮您:\n\n• 报名认证考试\n• 推荐学习课程\n• 提供讲师联系方式\n• 查询竞赛活动信息\n• 推荐就业岗位\n\n有什么我可以帮您的吗?'}
            </Text>
          </View>
        </View>
        <ChatArea messages={messages} isTyping={isTyping} onCardTap={handleCardTap} />
        <View className={styles.bottomPad} />
      </ScrollView>

      {/* Input area */}
      <View className={styles.inputArea}>
        <ChatInput
          value={inputValue}
          showQuickQuestions
          onInput={setInputValue}
          onSend={() => handleSend()}
          onQuickTap={(q) => handleSend(q)}
        />
      </View>
    </View>
  )
}
