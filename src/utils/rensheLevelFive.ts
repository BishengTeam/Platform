import { chinaDate } from './rensheGraduated.ts'
import { workAnniversary } from './rensheWorkYears.ts'

interface Submission { submitted_at: string }

function firstSubmissionDate(versions: Submission[]): string | null {
  if (!versions.length) return null
  const times = versions.map(version => {
    // API timestamps without an offset represent UTC, as on the server.
    const value = version.submitted_at
    return Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`)
  })
  if (times.some(value => !Number.isFinite(value))) return ''
  return chinaDate(new Date(Math.min(...times)))
}

export function levelFiveAgeBasis(versions: Submission[] = [], now = new Date()): string {
  return firstSubmissionDate(versions) ?? chinaDate(now)
}

export function validateLevelFiveAge(verifiedBirthDate: string | null | undefined, versions: Submission[] = [], now = new Date()): string | null {
  const birth = verifiedBirthDate || ''
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(birth) && Number.isFinite(Date.parse(birth)) && new Date(birth).toISOString().slice(0, 10) === birth && birth >= '1900-01-01' && birth <= chinaDate(now)
  if (!valid) return '本人实名出生日期缺失或无效，请通过实名更正流程补齐，不能在报名中修改身份'
  const basis = levelFiveAgeBasis(versions, now)
  if (!basis || basis > chinaDate(now)) return '首次提交时间异常，请联系管理员核实'
  if (workAnniversary(birth, 16) > basis) return versions.length ? '首次正式提交当日未满16周岁，补正不能改用今天的年龄' : '五级工龄型须在正式提交当日年满16周岁，年龄按本人已验证实名资料核验'
  return null
}
