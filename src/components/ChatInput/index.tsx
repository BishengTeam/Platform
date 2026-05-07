import { View, Text, Input, ScrollView } from '@tarojs/components'
import { Icon } from '@/components/Icon'
import { STRINGS } from '@/constants/strings'
import { getQuickQuestions } from '@/services/dataService'
import styles from './index.module.scss'

interface ChatInputProps {
  value: string
  showQuickQuestions: boolean
  onInput: (value: string) => void
  onSend: () => void
}

export function ChatInput({ value, showQuickQuestions, onInput, onSend }: ChatInputProps) {
  return (
    <View className={styles.bar}>
      {showQuickQuestions && (
        <ScrollView scrollX className={styles.quickRow}>
          {getQuickQuestions().map((q, idx) => (
            <View key={idx} className={styles.quickTag} onClick={() => onInput(q)}>
              <Text>{q}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      <View className={styles.row}>
        <Icon name='image' size={24} color='#999999' />
        <Input
          className={styles.field}
          type='text'
          placeholder={STRINGS.INDEX_PLACEHOLDER}
          value={value}
          onInput={(e) => onInput(e.detail.value)}
          onConfirm={onSend}
          confirmType='send'
        />
        {value.trim() ? (
          <View className={styles.sendBtn} onClick={onSend}>
            <Icon name='send' size={16} color='#ffffff' />
          </View>
        ) : (
          <Icon name='mic' size={24} color='#999999' />
        )}
      </View>
    </View>
  )
}
