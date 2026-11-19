import Taro from '@tarojs/taro'
import { getAuthSessionId } from './authState'

// 认证报名表单本地暂存（2026-11-19：退出表单后已填内容不再丢失）。
// 约束：只存考生自行填写字段与已上传材料的云端引用（storage_key）；
// 姓名、身份证号等由实名认证自动带出的字段一律不落盘；
// 按登录会话隔离，换账号不串用；提交成功后由表单页调用 clearEnrollmentDraft 清除。

interface StoredDraft<T> { owner: string | number; data: T }

export function loadEnrollmentDraft<T>(scope: string): T | null {
  try {
    const stored = Taro.getStorageSync(`cert_form_draft:${scope}`) as StoredDraft<T> | ''
    return stored && stored.owner === getAuthSessionId() ? stored.data : null
  } catch { return null }
}

export function saveEnrollmentDraft<T>(scope: string, data: T): void {
  try { Taro.setStorageSync(`cert_form_draft:${scope}`, { owner: getAuthSessionId(), data } satisfies StoredDraft<T>) } catch { /* 存储失败不阻断填写 */ }
}

export function clearEnrollmentDraft(scope: string): void {
  try { Taro.removeStorageSync(`cert_form_draft:${scope}`) } catch { /* 忽略 */ }
}
