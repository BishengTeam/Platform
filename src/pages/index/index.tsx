import { useState } from 'react'
import { View, ScrollView } from '@tarojs/components'
import { AuthGuard } from '@/components/AuthGuard'
import { ChatArea } from '@/components/ChatArea'
import { ChatInput } from '@/components/ChatInput'
import { FloatingService } from '@/components/FloatingService'
import { PageHeader } from '@/components/PageHeader'
import TabBar from '@/components/TabBar'
import { WelcomeCard } from '@/components/WelcomeCard'
import { STRINGS } from '@/constants/strings'
import { getInitialMessages } from '@/services/dataService'
import type { Message } from '@/types'
import styles from './index.module.scss'

let nextId = 100

export default function IndexPage() {
  const [messages, setMessages] = useState<Message[]>(getInitialMessages())
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const handleSend = () => {
    if (!inputValue.trim()) return

    const userMsg: Message = { id: nextId++, type: 'user', text: inputValue }
    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    setIsTyping(true)

    setTimeout(() => {
      setIsTyping(false)

      if (userMsg.text.includes('找老师') || userMsg.text.includes('联系方式') || userMsg.text.includes('老师')) {
        setMessages(prev => [
          ...prev,
          {
            id: nextId++,
            type: 'ai',
            text: STRINGS.INDEX_AI_TEACHER,
            card: {
              type: 'teacher',
              name: '张老师',
              title: 'H3CNE 金牌讲师 / 考官',
              wechat: 'H3C_TeacherZhang',
              phone: '138-1234-5678',
            }
          }
        ])
      } else {
        setMessages(prev => [
          ...prev,
          { id: nextId++, type: 'ai', text: STRINGS.INDEX_AI_DEFAULT(userMsg.text) }
        ])
      }
    }, 1500)
  }

  return (
    <AuthGuard>
    <View className={styles.page}>
      <PageHeader title={STRINGS.INDEX_NAV_TITLE} />

      <ScrollView className={styles.body} scrollY scrollWithAnimation>
        {messages.length === 1 && 
          <WelcomeCard />
        }

        <ChatArea messages={messages} isTyping={isTyping} />
      </ScrollView>

      <View className={styles.inputArea}>
        <FloatingService />
        <ChatInput
          value={inputValue}
          showQuickQuestions={messages.length === 1}
          onInput={setInputValue}
          onSend={handleSend}
        />
      </View>
      <TabBar />
    </View>
    </AuthGuard>
  )
}
