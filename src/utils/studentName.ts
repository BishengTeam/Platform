import Taro from '@tarojs/taro'
import { getUserProfile, updateUserProfile } from '@/services/userService'

/**
 * 练习/考试开始前的姓名闸门。
 *
 * 背景：后台需要按姓名统计每个学生的练习与考试成绩。微信不提供姓名，
 * 实名认证流程又过重，因此在学生真正开始做题时采集一次自填姓名
 * （存 user_profile.declared_name），已实名通过的用户直接复用实名姓名。
 *
 * 采集失败或用户拒绝时不记录姓名，但也不阻断做题——未归属的数据在后台
 * 显示为「未填写」，不会错记到别人头上。
 */

let cachedName: string | null | undefined

function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

export function isValidStudentName(raw: string): boolean {
  const name = normalizeName(raw)
  if (name.length < 2 || name.length > 32) return false
  if (/^\d+$/.test(name)) return false
  return /[\u4e00-\u9fffA-Za-z]/.test(name)
}

async function resolveCurrentName(): Promise<string | null> {
  try {
    const profile = await getUserProfile()
    const declared = profile.profile.declared_name?.trim()
    if (declared) return declared
    const realname = profile.realname
    if (realname?.identity_status === 'verified' && realname.real_name?.trim()) {
      return realname.real_name.trim()
    }
  } catch {
    // 读取失败时不做拦截：宁可少一条姓名，也不要挡住学生做题
    return null
  }
  return null
}

/** 返回 true 表示可以继续开始练习/考试。 */
export async function ensureStudentName(): Promise<boolean> {
  if (cachedName) return true
  const existing = await resolveCurrentName()
  if (existing) {
    cachedName = existing
    return true
  }

  const result = await Taro.showModal({
    title: '请填写姓名（用于成绩统计）',
    content: '',
    editable: true,
    placeholderText: '请输入真实姓名',
    confirmText: '确认',
    cancelText: '取消',
  } as never)
  const editableResult = result as unknown as { confirm?: boolean; content?: string }
  if (!editableResult.confirm) return false

  const name = normalizeName(String(editableResult.content || ''))
  if (!isValidStudentName(name)) {
    await Taro.showToast({ title: '请填写 2-32 个字的真实姓名', icon: 'none' })
    return false
  }

  try {
    const updated = await updateUserProfile({ declared_name: name })
    cachedName = updated.profile.declared_name?.trim() || name
    Taro.showToast({ title: '姓名已保存', icon: 'success' })
    return true
  } catch (error) {
    const message = error instanceof Error && error.message && !/fail|timeout|network/i.test(error.message)
      ? error.message
      : '姓名保存失败，请重试'
    Taro.showToast({ title: message, icon: 'none', duration: 2500 })
    return false
  }
}

/** 资料页修改姓名后调用，避免下一次进练习仍用旧缓存。 */
export function resetCachedStudentName(): void {
  cachedName = undefined
}
