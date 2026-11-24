import { View, Text, Input } from '@tarojs/components'
import type { ValidationResult } from '@/utils/validator'
import styles from './index.module.scss'

interface FormInputProps {
  /** 外层容器 id，供页面 ScrollView 的 scroll-into-view 聚焦定位 */
  id?: string
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
  onFocus?: () => void
  /** 关掉系统自动上推页面；配合页面自身滚动（scroll-into-view）使用，避免整页跳动 */
  adjustPosition?: boolean
  compact?: boolean
  /** 提供后整个输入框渲染为可点击视图（用于「点击跳转实名认证」等引导），不再响应输入 */
  onFieldClick?: () => void
}

export function FormInput({
  id,
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
  onFocus,
  adjustPosition,
  compact = false,
  onFieldClick,
}: FormInputProps) {
  const showError = error && !error.valid

  return (
    <View id={id} className={`${styles.wrap} ${compact ? styles.compactField : ''}`}>
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
        adjustPosition={adjustPosition}
        onInput={e => onChange(e.detail.value)}
        onFocus={onFocus}
        onBlur={onBlur}
      />}
      {showError && <Text className={styles.error}>{error.message}</Text>}
    </View>
  )
}
