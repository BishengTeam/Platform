import { View, Text, Input, ScrollView } from '@tarojs/components'
import { Icon } from '@/components/Icon'
import { STRINGS } from '@/constants/strings'
import styles from './index.module.scss'

interface ChatInputProps {
  value: string
  shouldShowQuickQuestions: boolean
  quickQuestions: string[]
  onInput: (value: string) => void
  onSend: () => void
  onQuickTap?: (q: string) => void
}

export function ChatInput({ value, shouldShowQuickQuestions, quickQuestions, onInput, onSend, onQuickTap }: ChatInputProps) {
  return (
    <View className={styles.bar}>
      {shouldShowQuickQuestions && (
        <ScrollView scrollX className={styles.quickRow}>
          {quickQuestions.map((q, idx) => (
            <View
              key={idx}
              className={styles.quickTag}
              onClick={() => onQuickTap ? onQuickTap(q) : onInput(q)}
            >
              <Text>{q}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      <View className={styles.row}>
        <Input
          className={styles.field}
          type='text'
          placeholder={STRINGS.INDEX_PLACEHOLDER}
          value={value}
          onInput={(e) => onInput(e.detail.value)}
          onConfirm={onSend}
          confirmType='send'
        />
        {value.trim() && (
          <View className={styles.sendBtn} onClick={onSend}>
            <Icon name='send' size={16} color='#ffffff' />
          </View>
        )}
      </View>
    </View>
  )
}
