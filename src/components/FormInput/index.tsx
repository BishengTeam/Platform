import { View, Text, Input } from '@tarojs/components'
import type { ValidationResult } from '@/utils/validator'
import styles from './index.module.scss'

interface FormInputProps {
  label: string
  required?: boolean
  placeholder: string
  value: string
  type?: 'text' | 'number' | 'idcard' | 'digit'
  maxlength?: number
  disabled?: boolean
  error?: ValidationResult
  onChange: (value: string) => void
  onBlur?: () => void
  compact?: boolean
  /** 提供后整个输入框渲染为可点击视图（用于「点击跳转实名认证」等引导），不再响应输入 */
  onFieldClick?: () => void
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
  compact = false,
  onFieldClick,
}: FormInputProps) {
  const showError = error && !error.valid

  return (
    <View className={`${styles.wrap} ${compact ? styles.compactField : ''}`}>
      <View className={styles.labelRow}>
        {required && <Text className={styles.asterisk}>*</Text>}
        <Text className={styles.label}>{label}</Text>
      </View>
      {onFieldClick ? <View
        className={`${styles.input} ${compact ? styles.compactInput : ''} ${compact && disabled ? styles.compactDisabled : ''} ${showError ? styles.inputError : ''} ${styles.fieldTap}`}
        onClick={onFieldClick}
      >
        <Text className={`${styles.tapText} ${value ? '' : styles.tapPlaceholder}`}>{value || placeholder}</Text>
      </View> : <Input
        className={`${styles.input} ${compact ? styles.compactInput : ''} ${compact && disabled ? styles.compactDisabled : ''} ${showError ? styles.inputError : ''}`}
        placeholder={placeholder}
        value={value}
        type={type}
        maxlength={maxlength}
        disabled={disabled}
        onInput={e => onChange(e.detail.value)}
        onBlur={onBlur}
      />}
      {showError && <Text className={styles.error}>{error.message}</Text>}
    </View>
  )
}
