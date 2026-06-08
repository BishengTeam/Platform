import { View, Text } from '@tarojs/components'
import { PriceRow } from '@/components/PriceRow'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import styles from '../form.module.scss'

interface Props {
  price: number
  /** 提交按钮文案，默认「提交报名」 */
  submitText?: string
  /** 提交中状态 */
  submitting?: boolean
  onSubmit: () => void
}

/**
 * 价格明细 + 提交按钮区域
 */
export function PriceSummary({ price, submitText, submitting, onSubmit }: Props) {
  return (
    <>
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>{STRINGS.FORM_PRICE_DETAIL}</Text>
        <View className={styles.priceCard}>
          <PriceRow label={STRINGS.FORM_PRICE_EXAM_FEE} value={price} />
          <View className={styles.divider} />
          <PriceRow label={STRINGS.FORM_PRICE_TOTAL} value={price} isTotal />
        </View>
      </View>
      <View className={styles.btnWrap}>
        <Button variant='gradient' size='lg' onClick={onSubmit}>
          {submitting ? STRINGS.IDENTITY_CHECK_SUBMITTING : (submitText || STRINGS.FORM_SUBMIT)}
        </Button>
      </View>
    </>
  )
}
