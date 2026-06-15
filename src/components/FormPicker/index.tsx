import { View, Text, Picker } from '@tarojs/components'
import type { ValidationResult } from '@/utils/validator'
import styles from './index.module.scss'

interface FormPickerProps {
  label: string
  value: string
  options: readonly string[]
  placeholder?: string
  error?: ValidationResult
  onChange: (value: string) => void
}

export function FormPicker({
  label,
  value,
  options,
  placeholder = '请选择',
  error,
  onChange,
}: FormPickerProps) {
  const selectedIndex = options.indexOf(value)
  const showError = error && !error.valid
  const displayText = value || placeholder

  return (
    <View className={styles.wrap}>
      <View className={styles.labelRow}>
        <Text className={styles.label}>{label}</Text>
      </View>
      <Picker
        mode='selector'
        range={options as string[]}
        value={selectedIndex >= 0 ? selectedIndex : 0}
        onChange={e => {
          const idx = e.detail.value as number
          onChange(options[idx])
        }}
      >
        <View className={`${styles.picker} ${showError ? styles.pickerError : ''}`}>
          <Text className={value ? styles.value : styles.placeholder}>
            {displayText}
          </Text>
          <Text className={styles.arrow}>&#9660;</Text>
        </View>
      </Picker>
      {showError && <Text className={styles.error}>{error.message}</Text>}
    </View>
  )
}
