import { Picker, Text, View } from '@tarojs/components'
import { FormInput } from '@/components/FormInput'
import type { RensheEmploymentInfo } from '@/services/rensheService'
import { chinaDate } from '@/utils/rensheGraduated'
import styles from './renshe.module.scss'

export default function TitleCertificateFields({ value, onChange, disabled, fieldIdPrefix, onFieldFocus }: { value: RensheEmploymentInfo; onChange: (value: RensheEmploymentInfo) => void; disabled: boolean; fieldIdPrefix?: string; onFieldFocus?: (id: string) => void }) {
  const certificate = value.title_certificate || { title_name: '', level: 'primary' as const, major: '', certificate_number: '', issued_on: '' }
  const update = (patch: Partial<typeof certificate>) => onChange({ ...value, title_certificate: { ...certificate, ...patch } })
  // 键盘弹出时不交给系统上推整页，改为页面滚动到当前输入框（与深信服表单一致）
  const fieldProps = (suffix: string) => fieldIdPrefix
    ? { id: `${fieldIdPrefix}-${suffix}`, adjustPosition: false, onFocus: () => onFieldFocus?.(`${fieldIdPrefix}-${suffix}`) }
    : {}
  return <View className={styles.card}>
    <Text className={styles.sectionTitle}>初级职称证书</Text>
    <Text className={styles.sectionDesc}>须符合申报职业专业对应关系，取得后累计相关工作满1年。证书与对应网查截图合并JPEG上传。</Text>
    <FormInput compact {...fieldProps('title-name')} label='职称名称' placeholder='按职称证书填写' required value={certificate.title_name} onChange={title_name => update({ title_name })} disabled={disabled} maxlength={128} />
    <Text>职称等级：初级</Text>
    <FormInput compact {...fieldProps('title-major')} label='职称专业' placeholder='按职称证书填写专业' required value={certificate.major} onChange={major => update({ major })} disabled={disabled} maxlength={128} />
    <FormInput compact {...fieldProps('title-number')} label='职称证书编号' placeholder='按职称证书填写编号' required value={certificate.certificate_number} onChange={certificate_number => update({ certificate_number })} disabled={disabled} maxlength={128} />
    <Picker mode='date' start='1900-01-01' end={chinaDate()} value={certificate.issued_on} disabled={disabled} onChange={event => update({ issued_on: event.detail.value })}><View className={styles.readonlyValue}>取得日期：{certificate.issued_on || '请选择'} ›</View></Picker>
  </View>
}
