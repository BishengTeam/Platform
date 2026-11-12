import Taro from '@tarojs/taro'
import type { QuizPracticeScopeType } from '@/contracts/quiz'

/** 练习助手记忆态：记住最后一次选择的练习范围，学习 tab 用来一键续练。 */
export interface RememberedPracticeScope {
  type: QuizPracticeScopeType
  id: number
  /** 范围展示名：库名 / 模块名 / 知识点名 */
  name: string
  /** 所属题库，用于范围失效时降级到库级 */
  libraryId: number
  libraryName: string
  questionCount: number
}

const STORAGE_KEY = 'practice_scope_memory'

function isScopeType(value: unknown): value is QuizPracticeScopeType {
  return value === 'library' || value === 'module' || value === 'knowledge_point'
}

export function readRememberedScope(): RememberedPracticeScope | null {
  try {
    const raw = Taro.getStorageSync(STORAGE_KEY)
    if (!raw || typeof raw !== 'object') return null
    const value = raw as Record<string, unknown>
    const id = Number(value.id)
    const libraryId = Number(value.libraryId)
    if (!isScopeType(value.type)) return null
    if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(libraryId) || libraryId <= 0) return null
    if (typeof value.name !== 'string' || !value.name) return null
    if (typeof value.libraryName !== 'string' || !value.libraryName) return null
    const questionCount = Number(value.questionCount)
    if (!Number.isFinite(questionCount) || questionCount <= 0) return null
    return {
      type: value.type,
      id,
      name: value.name,
      libraryId,
      libraryName: value.libraryName,
      questionCount,
    }
  } catch {
    return null
  }
}

export function rememberScope(scope: RememberedPracticeScope): void {
  try {
    Taro.setStorageSync(STORAGE_KEY, scope)
  } catch {
    // 存储失败只影响续练记忆，不阻断主流程
  }
}

export function clearRememberedScope(): void {
  try {
    Taro.removeStorageSync(STORAGE_KEY)
  } catch {
    // 同上
  }
}
