import { View, Text, Input } from '@tarojs/components'
import type { ValidationResult } from '@/utils/validator'
import styles from './index.module.scss'

interface FormInputProps {
  label: string
  required?: boolean
  placeholder: string
  value: string
  type?: 'text' | 'number' | 'idcard'
  maxlength?: number
  disabled?: boolean
  error?: ValidationResult
  onChange: (value: string) => void
  onBlur?: () => void
}

export function FormInput({
  label,
  required = false,
  placeholder,
  value,
  type = 'text',
  maxlength,
  disabled,
  error,
  onChange,
  onBlur,
}: FormInputProps) {
  const showError = error && !error.valid

  return (
    <View className={styles.wrap}>
      <View className={styles.labelRow}>
        {required && <Text className={styles.asterisk}>*</Text>}
        <Text className={styles.label}>{label}</Text>
      </View>
      <Input
        className={`${styles.input} ${showError ? styles.inputError : ''}`}
        placeholder={placeholder}
        value={value}
        type={type}
        maxlength={maxlength}
        disabled={disabled}
        onInput={e => onChange(e.detail.value)}
        onBlur={onBlur}
      />
      {showError && <Text className={styles.error}>{error.message}</Text>}
    </View>
  )
}
