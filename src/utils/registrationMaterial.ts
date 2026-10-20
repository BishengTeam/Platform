import type { RensheWorkExperience } from '../services/rensheService.ts'

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

export function materialSources(extensions: string[]): Array<'file' | 'image'> {
  const normalized = extensions.map(value => value.toLowerCase())
  return [
    ...(normalized.some(value => !IMAGE_EXTENSIONS.has(value)) ? ['file' as const] : []),
    ...(normalized.some(value => IMAGE_EXTENSIONS.has(value)) ? ['image' as const] : []),
  ]
}

export function currentWorkUnit(experiences: RensheWorkExperience[]): string | null {
  const units = [...new Set(experiences.filter(item => item.end_date === null).map(item => item.work_unit.trim()).filter(Boolean))]
  return units.length === 1 ? units[0] : null
}
