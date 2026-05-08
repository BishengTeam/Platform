import { View, Text } from '@tarojs/components'
import { Avatar } from '@nutui/nutui-react-taro'
import { Icon } from '@/components/Icon'
import { Button } from '@/components/Button'
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
            <Avatar
              size='48'
              icon={<Icon name='sparkles' size={20} color='#ffffff' />}
              background='linear-gradient(to bottom right, #1677FF, #4096FF)'
            />
          )}

          <View className={`${styles.bubbleContent} ${msg.type === 'user' ? styles.userContent : styles.aiContent}`}>
            <View className={`${styles.bubble} ${msg.type === 'user' ? styles.userBubbleBg : styles.aiBubbleBg}`}>
              <Text className={styles.bubbleText}>{msg.text}</Text>
            </View>

            {msg.card && msg.card.type === 'teacher' && (
              <View className={styles.teacherCard}>
                <View className={styles.teacherHead}>
                  <Avatar
                    size='48'
                    icon={<Icon name='user' size={24} color='#1677FF' />}
                    background='#E6F7FF'
                  />
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
                <Button
                  variant='gradient'
                  size='sm'
                  className={styles.teacherBtn}
                >
                  {STRINGS.INDEX_COPY_WECHAT}
                </Button>
              </View>
            )}
          </View>

          {msg.type === 'user' && (
            <Avatar
              size='48'
              icon={<Icon name='user' size={20} color='#ffffff' />}
              background='linear-gradient(to bottom right, #FF8C00, #FFB347)'
            />
          )}
        </View>
      ))}

      {isTyping && (
        <View className={`${styles.chatBubble} ${styles.aiBubble} fade-in-up-sm`}>
          <Avatar
            size='72'
            icon={<Icon name='sparkles' size={20} color='#ffffff' />}
            background='linear-gradient(to bottom right, #1677FF, #4096FF)'
          />
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
