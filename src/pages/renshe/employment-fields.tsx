import { Picker, Text, View } from '@tarojs/components'
import { FormInput } from '@/components/FormInput'
import { Button } from '@/components/Button'
import type { RensheEmploymentInfo, RensheWorkExperience, RensheReportingOptions } from '@/services/rensheService'
import { chinaDate, EDUCATION_LABELS } from '@/utils/rensheGraduated'
import styles from './renshe.module.scss'

export const emptyExperience = (): RensheWorkExperience => ({ work_unit: '', position: '', occupation_name: '', start_date: '', end_date: null })

export default function EmploymentFields({ value, onChange, compound, options, disabled }: { value: RensheEmploymentInfo; onChange: (value: RensheEmploymentInfo) => void; compound: boolean; options: RensheReportingOptions | null; disabled: boolean }) {
  const updateWork = (index: number, patch: Partial<RensheWorkExperience>) => onChange({ ...value, work_experiences: value.work_experiences.map((item, i) => i === index ? { ...item, ...patch } : item) })
  const certificate = value.skill_certificate || { occupation_name: '', grade: 5 as const, certificate_number: '', issued_on: '' }
  const updateCertificate = (patch: Partial<typeof certificate>) => onChange({ ...value, skill_certificate: { ...certificate, ...patch } })
  const levels = options?.education_levels || []
  return <>
    <View className={styles.card}>
      <Text className={styles.sectionTitle}>文化程度</Text>
      <Text className={styles.sectionDesc}>按实际情况填写，用于报送；本路径以工作经历{compound ? '及五级技能证书' : ''}核验资格，不要求毕业证或学历备案表。</Text>
      <View className={styles.pickerField}><Text className={styles.label}>文化程度 *</Text><Picker mode='selector' disabled={disabled || !options} range={levels.map(item => (options?.education_labels || EDUCATION_LABELS)[item] || item)} onChange={event => onChange({ ...value, cultural_education: levels[Number(event.detail.value)] })}><View className={styles.readonlyValue}>{EDUCATION_LABELS[value.cultural_education] || '请选择'} ›</View></Picker></View>
    </View>
    {compound && <View className={styles.card}>
      <Text className={styles.sectionTitle}>已取得的五级／初级工证书</Text>
      <Text className={styles.sectionDesc}>须为本职业或资料列明相关职业的五级证书。证书取得后累计相关工作须满3年；职业对应关系由初审结合原件核验。</Text>
      <FormInput label='证书职业／工种' required value={certificate.occupation_name} placeholder='按证书原文填写' disabled={disabled} onChange={occupation_name => updateCertificate({ occupation_name })} maxlength={128} />
      <Text className={styles.readonlyValue}>证书等级：五级／初级工</Text>
      <FormInput label='证书编号' required value={certificate.certificate_number} placeholder='按证书原文填写' disabled={disabled} onChange={certificate_number => updateCertificate({ certificate_number })} maxlength={128} />
      <View className={styles.pickerField}><Text className={styles.label}>证书取得日期 *</Text><Picker mode='date' start='1900-01-01' end={chinaDate()} value={certificate.issued_on || ''} disabled={disabled} onChange={event => updateCertificate({ issued_on: event.detail.value })}><View className={styles.readonlyValue}>{certificate.issued_on || '请选择取得日期'} ›</View></Picker></View>
    </View>}
    <View className={styles.card}>
      <Text className={styles.sectionTitle}>相关职业工作经历</Text>
      <Text className={styles.sectionDesc}>逐段填写实际工作经历，最多20段。重叠时间不重复累计；{compound ? '仅证书取得后的有效相关经历计入3年门槛。' : '累计相关工作须满5年。'}单位、岗位及职业是否相关由初审核验。</Text>
      {value.work_experiences.map((item, index) => <View key={index} className={styles.uploadItem}>
        <Text className={styles.sectionTitle}>第{index + 1}段工作经历</Text>
        <FormInput label='工作单位' required value={item.work_unit} placeholder='单位完整名称，与工龄及社保证明对应' disabled={disabled} onChange={work_unit => updateWork(index, { work_unit })} maxlength={128} />
        <FormInput label='岗位' required value={item.position} placeholder='实际岗位名称' disabled={disabled} onChange={position => updateWork(index, { position })} maxlength={128} />
        <FormInput label='从事职业／工种' required value={item.occupation_name} placeholder='实际职业名称，不自行认定相关即通过' disabled={disabled} onChange={occupation_name => updateWork(index, { occupation_name })} maxlength={128} />
        <View className={styles.pickerField}><Text className={styles.label}>开始日期 *</Text><Picker mode='date' start='1900-01-01' end={chinaDate()} value={item.start_date || ''} disabled={disabled} onChange={event => updateWork(index, { start_date: event.detail.value })}><View className={styles.readonlyValue}>{item.start_date || '请选择'} ›</View></Picker></View>
        <View className={styles.pickerField}><Text className={styles.label}>工作结束情况 *</Text><Picker mode='selector' range={['持续至今', '已经结束']} disabled={disabled} onChange={event => updateWork(index, { end_date: Number(event.detail.value) === 0 ? null : '' })}><View className={styles.readonlyValue}>{item.end_date === null ? '持续至今' : '已经结束'} ›</View></Picker></View>
        {item.end_date !== null && <View className={styles.pickerField}><Text className={styles.label}>结束日期 *</Text><Picker mode='date' start={item.start_date || '1900-01-01'} end={chinaDate()} value={item.end_date || ''} disabled={disabled} onChange={event => updateWork(index, { end_date: event.detail.value })}><View className={styles.readonlyValue}>{item.end_date || '请选择'} ›</View></Picker></View>}
        {value.work_experiences.length > 1 && <Button variant='secondary' disabled={disabled} onClick={() => onChange({ ...value, work_experiences: value.work_experiences.filter((_, i) => i !== index) })}>删除本段</Button>}
      </View>)}
      <Button variant='secondary' disabled={disabled || value.work_experiences.length >= 20} onClick={() => onChange({ ...value, work_experiences: [...value.work_experiences, emptyExperience()] })}>添加一段工作经历</Button>
    </View>
  </>
}
