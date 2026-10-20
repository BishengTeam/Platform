import { useEffect, useState, type ReactNode } from 'react'
import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Button } from '../Button'
import styles from './index.module.scss'

export function RegistrationSummary({ title, subtitle, badge, priceCents, items, children }: {
  title: string; subtitle?: string; badge: string; priceCents?: number | null
  items: Array<{ label: string; value: string; wide?: boolean }>; children?: ReactNode
}) {
  return <View className={styles.registrationSummary}>
    <View className={styles.registrationSummaryHead}><Text className={styles.registrationBadge}>{badge}</Text><Text className={styles.registrationPrice}>{priceCents == null ? '—' : `¥${(priceCents / 100).toFixed(2)}`}</Text></View>
    <Text className={styles.registrationHeading}>{title}</Text>
    {subtitle && <Text className={styles.registrationHint}>{subtitle}</Text>}
    <View className={styles.registrationSummaryGrid}>{items.map(item => <View key={item.label} className={`${styles.registrationSummaryItem} ${item.wide ? styles.registrationFullWidth : ''}`}><Text className={styles.registrationSmallLabel}>{item.label}</Text><Text className={styles.registrationSummaryValue}>{item.value}</Text></View>)}</View>
    {children}
  </View>
}

export function RequirementDisclosure({ children, title = '查看要求' }: { children: ReactNode; title?: string }) {
  const [open, setOpen] = useState(false)
  return <View className={styles.registrationDisclosure}>
    <Text className={styles.registrationDisclosureToggle} onClick={() => setOpen(value => !value)}>{open ? '收起要求' : title} {open ? '⌃' : '⌄'}</Text>
    {open && <View className={styles.registrationDisclosureBody}>{children}</View>}
  </View>
}

export function MaterialItem({ id, title, required, requirement, file, uploading, disabled, error, onUpload, uploadLabel, children }: {
  id?: string; title: string; required?: boolean; requirement: string
  file?: { name: string; size: number }; uploading?: boolean; disabled?: boolean; error?: string
  onUpload: () => void; uploadLabel?: string; children?: ReactNode
}) {
  return <View id={id} className={styles.registrationMaterial}>
    <View className={styles.registrationMaterialHead}><Text className={styles.registrationMaterialTitle}>{title}{required && <Text className={styles.registrationRequired}> *</Text>}</Text><Text className={styles.registrationMaterialStatus}>{uploading ? '处理中' : file ? '已上传' : '待上传'}</Text></View>
    <Text className={styles.registrationHint}>{requirement}</Text>
    {file && <Text className={styles.registrationFile}>{file.name} · {Math.max(1, Math.ceil(file.size / 1024))} KB</Text>}
    {children}
    <View className={styles.registrationMaterialAction}><Button variant='secondary' size='sm' loading={uploading} disabled={disabled} onClick={onUpload}>{uploading ? '选择／上传中…' : file ? '替换材料' : uploadLabel || '上传材料'}</Button></View>
    {error && <Text className={styles.registrationError}>{error}</Text>}
  </View>
}

export function RegistrationSubmitBar({ priceCents, priceLabel = '报名费', priceText, label, disabled, loading, onSubmit }: {
  priceCents?: number | null; priceLabel?: string; priceText?: string; label: string
  disabled?: boolean; loading?: boolean; onSubmit: () => void
}) {
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  useEffect(() => {
    if (typeof Taro.onKeyboardHeightChange !== 'function' || typeof Taro.offKeyboardHeightChange !== 'function') return
    const listener = (event: { height: number }) => setKeyboardOpen(event.height > 0)
    Taro.onKeyboardHeightChange(listener)
    return () => Taro.offKeyboardHeightChange(listener)
  }, [])
  if (keyboardOpen) return null
  return <View className={styles.registrationSubmitBar}>
    <View className={styles.registrationSubmitFee}><Text className={styles.registrationSmallLabel}>{priceLabel}</Text><Text className={styles.registrationSubmitAmount}>{priceText || (priceCents == null ? '—' : `¥${(priceCents / 100).toFixed(2)}`)}</Text></View>
    <View className={styles.registrationSubmitAction}><Button variant='gradient' className={styles.registrationSubmitButton} disabled={disabled} loading={loading} onClick={onSubmit}>{label}</Button></View>
  </View>
}
