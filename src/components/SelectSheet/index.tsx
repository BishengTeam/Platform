import { ScrollView, Text, View } from '@tarojs/components'
import styles from './index.module.scss'

export interface SelectSheetOption {
  value: string
  label: string
}

interface SelectSheetProps {
  visible: boolean
  title: string
  options: readonly SelectSheetOption[]
  value: string
  onSelect: (value: string) => void
  onClose: () => void
  emptyText?: string
  closeText?: string
}

/**
 * 自绘单选弹层。
 * 原生 <picker> 的弹层由微信客户端绘制：PC 端会固定画在窗口正中、不跟随触发元素，
 * 双栏视图下还会压到另一栏。用页面内弹层可保证 PC 与手机端落点一致。
 */
export function SelectSheet({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
  emptyText = '暂无可选项',
  closeText = '关闭',
}: SelectSheetProps) {
  if (!visible) return null

  return (
    <View className={styles.overlay} onClick={onClose}>
      <View className={styles.panel} onClick={event => event.stopPropagation()}>
        <View className={styles.header}>
          <Text className={styles.title}>{title}</Text>
          <Text className={styles.close} onClick={onClose} aria-role='button' aria-label={`${closeText}${title}`}>{closeText}</Text>
        </View>
        {options.length
          ? (
            <ScrollView className={styles.list} scrollY>
              {options.map(option => {
                const active = option.value === value
                return (
                  <View key={option.value} className={`${styles.item} ${active ? styles.itemActive : ''}`}
                    onClick={() => { onSelect(option.value); onClose() }}>
                    <Text className={`${styles.itemText} ${active ? styles.itemTextActive : ''}`}>{option.label}</Text>
                    {active && <Text className={styles.check}>✓</Text>}
                  </View>
                )
              })}
            </ScrollView>
          )
          : <Text className={styles.empty}>{emptyText}</Text>}
      </View>
    </View>
  )
}
