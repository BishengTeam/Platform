import Taro from '@tarojs/taro'

export interface RegistrationPreview {
  key: string
  title: string
  categoryLabel: string
  statusLabel: string
  statusGroup: 'active' | 'passed' | 'closed'
  extraRows: Array<{ label: string; value: string }>
}

const PRELOAD_KEY = 'registration-preview'

export function preloadRegistrationPreview(preview: RegistrationPreview) {
  Taro.preload(PRELOAD_KEY, preview)
}

export function readRegistrationPreview(key: string): RegistrationPreview | null {
  const value = Taro.preloadData?.[PRELOAD_KEY] as RegistrationPreview | undefined
  if (!value || value.key !== key) return null
  delete Taro.preloadData?.[PRELOAD_KEY]
  return value
}
