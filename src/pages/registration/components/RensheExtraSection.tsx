import { View, Text } from '@tarojs/components'
import { FormInput } from '@/components/FormInput'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import type { ValidationResult } from '@/utils/validator'
import styles from './form.module.scss'

export interface RensheExtraSectionProps {
  branch: string; setBranch: (v: string) => void
  errors: Record<string, ValidationResult>
}

const BRANCHES = [
  STRINGS.RENSHE_BRANCH_NETWORK_SECURITY,
  STRINGS.RENSHE_BRANCH_BUSINESS_DATA,
  STRINGS.RENSHE_BRANCH_AI_ENGINEER,
  STRINGS.RENSHE_BRANCH_IOT_ENGINEER,
]

export function RensheExtraSection({ branch, setBranch, errors }: RensheExtraSectionProps) {
  return (
    <View className={styles.section}>
      <Text className={styles.sectionTitle}>{STRINGS.FORM_RENSHE_BRANCH}</Text>
      <View className={styles.summaryCard}>
        {BRANCHES.map((b) => (
          <View key={b} className={styles.identityRow} onClick={() => setBranch(b)}>
            <View className={`${styles.identityOption} ${branch === b ? styles.identityActive : ''}`}>
              <Text>{b}</Text>
            </View>
          </View>
        ))}
        {errors.branch && <Text className={styles.errorText}>{errors.branch.message}</Text>}
      </View>
    </View>
  )
}
