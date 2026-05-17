import { View, Text } from '@tarojs/components'
import type { ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import styles from './index.module.scss'

interface Props {
  agreed: boolean
  onChange: (agreed: boolean) => void
  className?: string
  children: ReactNode
}

export function AgreementCheckbox({ agreed, onChange, className, children }: Props) {
  return (
    <View className={`${styles.agreement} ${className ?? ''}`}>
      <View className={styles.checkbox} onClick={() => onChange(!agreed)}>
        <Icon name={agreed ? 'check-circle-2' : 'circle'} size={16} color={agreed ? '#1677FF' : '#999'} />
      </View>
      <Text className={styles.text}>{children}</Text>
    </View>
  )
}
