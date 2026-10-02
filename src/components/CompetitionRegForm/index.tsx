import { Input, Picker, Text, Textarea, View } from '@tarojs/components'
import type { CompetitionCustomField } from '@/types'
import {
  emptyCompetitionRegFormValues,
  validateCompetitionRegForm,
  type CompetitionRegFormValues,
} from './validate'
import styles from './index.module.scss'

export { emptyCompetitionRegFormValues, validateCompetitionRegForm }
export type { CompetitionRegFormValues }

interface CompetitionRegFormProps {
  fields: CompetitionCustomField[] | null | undefined
  values: CompetitionRegFormValues
  onChange: (values: CompetitionRegFormValues) => void
}

/** 学校/姓名/手机 + 后台配置的自定义字段（报名与“我的报名”修改共用） */
export function CompetitionRegForm({ fields, values, onChange }: CompetitionRegFormProps) {
  const setCustomValue = (key: string, value: string | string[]): void => {
    onChange({ ...values, custom: { ...values.custom, [key]: value } })
  }

  const renderCustomField = (field: CompetitionCustomField) => {
    const value = values.custom[field.key]

    if (field.type === 'select' || field.type === 'radio') {
      const options = field.options || []
      const selectedIndex = options.indexOf(String(value ?? ''))
      return (
        <View key={field.key}>
          <View className={styles.fieldLabel}>
            {field.label}
            {field.required && <Text className={styles.required}> *</Text>}
          </View>
          <Picker
            mode='selector'
            range={options}
            value={selectedIndex >= 0 ? selectedIndex : 0}
            onChange={(e) => {
              const index = Number(e.detail.value)
              if (Number.isInteger(index) && index >= 0 && index < options.length) {
                setCustomValue(field.key, options[index])
              }
            }}
          >
            <View className={styles.fieldInput} style={{ display: 'flex', alignItems: 'center' }}>
              <Text style={{ color: value ? '#17233d' : '#98a2b3' }}>
                {value || field.placeholder || `请选择${field.label}`}
              </Text>
            </View>
          </Picker>
        </View>
      )
    }

    if (field.type === 'checkbox') {
      const options = field.options || []
      const selected: string[] = Array.isArray(value) ? value : []
      return (
        <View key={field.key}>
          <View className={styles.fieldLabel}>
            {field.label}
            {field.required && <Text className={styles.required}> *</Text>}
          </View>
          <View style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
            {options.map((opt: string) => (
              <View
                key={opt}
                className={`${styles.tagOption} ${selected.includes(opt) ? styles.tagSelected : ''}`}
                onClick={() => {
                  if (selected.includes(opt)) {
                    setCustomValue(field.key, selected.filter(s => s !== opt))
                  } else {
                    setCustomValue(field.key, [...selected, opt])
                  }
                }}
              >
                <Text>{opt}</Text>
              </View>
            ))}
          </View>
        </View>
      )
    }

    if (field.type === 'date') {
      return (
        <View key={field.key}>
          <View className={styles.fieldLabel}>
            {field.label}
            {field.required && <Text className={styles.required}> *</Text>}
          </View>
          <Picker
            mode='date'
            value={String(value || '2000-01-01')}
            onChange={(e) => setCustomValue(field.key, e.detail.value)}
          >
            <View className={styles.fieldInput} style={{ display: 'flex', alignItems: 'center' }}>
              <Text style={{ color: value ? '#17233d' : '#98a2b3' }}>
                {value || field.placeholder || `请选择${field.label}`}
              </Text>
            </View>
          </Picker>
        </View>
      )
    }

    if (field.type === 'textarea') {
      return (
        <View key={field.key}>
          <View className={styles.fieldLabel}>
            {field.label}
            {field.required && <Text className={styles.required}> *</Text>}
          </View>
          <Textarea
            className={styles.fieldTextarea}
            placeholder={field.placeholder || `请输入${field.label}`}
            value={String(value ?? '')}
            maxlength={field.max_length || 1000}
            onInput={(e) => setCustomValue(field.key, e.detail.value)}
          />
        </View>
      )
    }

    // text, number, phone, email, idcard → Input
    const inputType = field.type === 'number' ? 'digit' as const
      : field.type === 'phone' ? 'number' as const
      : 'text' as const

    return (
      <View key={field.key}>
        <View className={styles.fieldLabel}>
          {field.label}
          {field.required && <Text className={styles.required}> *</Text>}
        </View>
        <Input
          className={styles.fieldInput}
          type={inputType}
          placeholder={field.placeholder || `请输入${field.label}`}
          value={String(value ?? '')}
          maxlength={field.type === 'phone' ? 11 : field.type === 'idcard' ? 18 : (field.max_length || 128)}
          onInput={(e) => setCustomValue(field.key, e.detail.value)}
        />
      </View>
    )
  }

  return (
    <View>
      <View className={styles.fieldLabel}>学校 <Text className={styles.required}>*</Text></View>
      <Input
        className={styles.fieldInput}
        placeholder='请输入学校名称'
        value={values.school}
        maxlength={128}
        onInput={(e) => onChange({ ...values, school: e.detail.value })}
      />

      <View className={styles.fieldLabel}>姓名 <Text className={styles.required}>*</Text></View>
      <Input
        className={styles.fieldInput}
        placeholder='请输入真实姓名'
        value={values.real_name}
        maxlength={64}
        onInput={(e) => onChange({ ...values, real_name: e.detail.value })}
      />

      <View className={styles.fieldLabel}>手机号 <Text className={styles.required}>*</Text></View>
      <Input
        className={styles.fieldInput}
        type='number'
        placeholder='请输入联系电话'
        value={values.phone}
        maxlength={11}
        onInput={(e) => onChange({ ...values, phone: e.detail.value })}
      />

      {(fields || []).map(field => renderCustomField(field))}
    </View>
  )
}
