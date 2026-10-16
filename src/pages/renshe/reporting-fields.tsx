import { Picker, Text, View } from '@tarojs/components'
import { FormInput } from '@/components/FormInput'
import type { RensheReportingInfo, RensheReportingOptions } from '@/services/rensheService'
import { chinaDate } from '@/utils/rensheGraduated'
import styles from './renshe.module.scss'

export default function ReportingFields({ value, onChange, options, disabled }: { value: Partial<RensheReportingInfo>; onChange: (value: Partial<RensheReportingInfo>) => void; options: RensheReportingOptions | null; disabled: boolean }) {
  const field = (key: keyof RensheReportingInfo, next: string | boolean | null) => onChange({ ...value, [key]: next })
  const pick = (key: 'occupation_status' | 'ethnicity' | 'political_status', label: string, choices: string[]) => <View className={styles.pickerField}><Text className={styles.label}>{label} *</Text><Picker mode='selector' range={choices} disabled={disabled || !options} onChange={event => field(key, choices[Number(event.detail.value)])}><View className={styles.readonlyValue}>{value[key] || '请选择'} ›</View></Picker></View>
  return <View className={styles.card}>
    <Text className={styles.sectionTitle}>补齐当前报送信息</Text>
    <Text className={styles.sectionDesc}>填写本人实际情况。姓名、身份证、学历及报名材料继续使用原报名规则；以下信息随补正保存为新材料版本。</Text>
    {pick('occupation_status', '从事职业', options?.occupations || [])}
    {pick('ethnicity', '民族', options?.ethnicities || [])}
    {pick('political_status', '政治面貌', options?.political_statuses || [])}
    <View className={styles.pickerField}><Text className={styles.label}>是否参加过工作 *</Text><Picker mode='selector' range={['参加过工作', '尚未参加工作']} disabled={disabled} onChange={event => onChange({ ...value, has_work_experience: Number(event.detail.value) === 0, work_start_date: Number(event.detail.value) === 0 ? value.work_start_date : null })}><View className={styles.readonlyValue}>{value.has_work_experience === undefined ? '请选择' : value.has_work_experience ? '参加过工作' : '尚未参加工作'} ›</View></Picker></View>
    {value.has_work_experience && <View className={styles.pickerField}><Text className={styles.label}>参加工作日期 *</Text><Picker mode='date' start='1900-01-01' end={chinaDate()} value={value.work_start_date || ''} disabled={disabled} onChange={event => field('work_start_date', event.detail.value)}><View className={styles.readonlyValue}>{value.work_start_date || '请选择真实参加工作日期'} ›</View></Picker></View>}
    <Text className={styles.sectionDesc}>报送固定使用参加工作日期，入学日期、毕业日期不能替代。未参加工作、无法提供该日期的，请联系管理员核实。</Text>
    <FormInput label='实际职业年限（年）' required value={String(value.occupation_years ?? '')} placeholder='按实填写，允许0，最多两位小数' disabled={disabled} onChange={next => field('occupation_years', next)} maxlength={7} />
    <FormInput label='工作单位（选填）' placeholder='按实际情况填写' value={value.work_unit || ''} disabled={disabled} onChange={next => field('work_unit', next)} maxlength={128} />
    <FormInput label='社保参保单位（选填）' placeholder='按实际情况填写' value={value.social_insurance_unit || ''} disabled={disabled} onChange={next => field('social_insurance_unit', next)} maxlength={128} />
  </View>
}
