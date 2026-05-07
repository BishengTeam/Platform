import { View, Text } from '@tarojs/components'
import { Icon } from '@/components/Icon'
import { STRINGS } from '@/constants/strings'
import type { Message } from '@/types'
import styles from './index.module.scss'

interface ChatAreaProps {
  messages: Message[]
  isTyping: boolean
}

export function ChatArea({ messages, isTyping }: ChatAreaProps) {
  return (
    <View className={styles.chatList}>
      {messages.map((msg) => (
        <View
          key={msg.id}
          className={`${styles.chatBubble} ${msg.type === 'user' ? styles.userBubble : styles.aiBubble} fade-in-up-sm`}
          style={{ animationDelay: `${(messages.indexOf(msg) - 1) * 0.05}s` }}
        >
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
        <View className={`${styles.chatBubble} ${styles.aiBubble} fade-in-up-sm`}>
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
  )
}
