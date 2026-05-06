import { useState } from 'react'
import { View, Text, Input, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { Icon } from '@/components/Icon'
import TabBar from '@/components/TabBar'
import { ZONE_ROUTES } from '@/constants/routes'
import { STRINGS } from '@/constants/strings'
import { getZoneIcons, getQuickQuestions, getInitialMessages } from '@/services/dataService'
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

  const handleQuickQuestion = (q: string) => {
    setInputValue(q)
  }

  const handleZoneNavigate = (route: string) => {
    Taro.navigateTo({ url: route })
  }

  return (
    <AuthGuard>
    <View className={styles.page}>
      <View className={styles.nav}>
        <Text className={styles.navTitle}>{STRINGS.INDEX_NAV_TITLE}</Text>
      </View>

      <ScrollView className={styles.body} scrollY scrollWithAnimation>
        {messages.length === 1 && (
          <View className={`${styles.welcomeCard} fade-in-up`}>
            <Text className={styles.welcomeTitle}>{STRINGS.INDEX_WELCOME_TITLE}</Text>
            <Text className={styles.welcomeSub}>{STRINGS.INDEX_WELCOME_SUB}</Text>
            <View className={styles.zoneRow}>
              {getZoneIcons().map((zone) => (
                <View key={zone.id} className={styles.zoneItem} onClick={() => handleZoneNavigate(ZONE_ROUTES[zone.name])}>
                  <View className={styles.zoneIcon} style={{ backgroundColor: zone.bg }}>
                    <Icon name={zone.icon} size={24} color={zone.color} />
                  </View>
                  <Text className={styles.zoneName}>{zone.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View className={styles.chatList}>
          {messages.map((msg) => (
            <View key={msg.id} className={`${styles.chatBubble} ${msg.type === 'user' ? styles.userBubble : styles.aiBubble}`}>
              {msg.type === 'ai' && (
                <View className={styles.aiAvatar}>
                  <Icon name='sparkles' size={18} color='#ffffff' />
                </View>
              )}

              <View className={`${styles.bubbleContent} ${msg.type === 'user' ? styles.userContent : styles.aiContent}`}>
                <View className={`${styles.bubble} ${msg.type === 'user' ? styles.userBubbleBg : styles.aiBubbleBg}`}>
                  <Text className={styles.bubbleText}>{msg.text}</Text>
                </View>

                {msg.card && msg.card.type === 'teacher' && (
                  <View className={styles.teacherCard}>
                    <View className={styles.teacherHead}>
                      <View className={styles.teacherAvatar}>
                        <Icon name='user' size={24} color='#1677FF' />
                      </View>
                      <View>
                        <Text className={styles.teacherName}>{msg.card.name}</Text>
                        <Text className={styles.teacherTitle}>{msg.card.title}</Text>
                      </View>
                    </View>
                    <View className={styles.teacherInfo}>
                      <View className={styles.teacherRow}>
                        <Text className={styles.teacherLabel}>{STRINGS.INDEX_LABEL_WECHAT}</Text>
                        <Text className={styles.teacherValue}>{msg.card.wechat}</Text>
                      </View>
                      <View className={styles.teacherRow}>
                        <Text className={styles.teacherLabel}>{STRINGS.INDEX_LABEL_PHONE}</Text>
                        <Text className={styles.teacherValue}>{msg.card.phone}</Text>
                      </View>
                    </View>
                    <View className={styles.teacherBtn}>
                      <Text className={styles.teacherBtnText}>{STRINGS.INDEX_COPY_WECHAT}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          ))}

          {isTyping && (
            <View className={`${styles.chatBubble} ${styles.aiBubble} fade-in`}>
              <View className={styles.aiAvatar}>
                <Icon name='sparkles' size={18} color='#ffffff' />
              </View>
              <View className={styles.typingDots}>
                <View className={styles.typingDot} />
                <View className={styles.typingDot} />
                <View className={styles.typingDot} />
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View className={styles.inputArea}>
        {messages.length === 1 && (
          <ScrollView scrollX className={styles.quickRow}>
            {getQuickQuestions().map((q, idx) => (
              <View key={idx} className={styles.quickTag} onClick={() => handleQuickQuestion(q)}>
                <Text>{q}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        <View className={styles.inputRow}>
          <Icon name='image' size={24} color='#999999' />
          <Input
            className={styles.inputField}
            type='text'
            placeholder={STRINGS.INDEX_PLACEHOLDER}
            value={inputValue}
            onInput={(e) => setInputValue(e.detail.value)}
            onConfirm={handleSend}
            confirmType='send'
          />
          {inputValue.trim() ? (
            <View className={styles.sendBtn} onClick={handleSend}>
              <Icon name='send' size={16} color='#ffffff' />
            </View>
          ) : (
            <Icon name='mic' size={24} color='#999999' />
          )}
        </View>
      </View>
      <TabBar />
    </View>
    </AuthGuard>
  )
}
