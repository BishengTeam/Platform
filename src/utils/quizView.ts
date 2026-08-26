import type { QuizAnswer, QuizQuestionType } from '@/contracts/quiz'

export function quizOptions(options: Record<string, string>): Array<{ label: string; text: string }> {
  return Object.entries(options)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, text]) => ({ label, text }))
}

function hashSeed(seed: string): number {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function nextRandom(state: number): [number, number] {
  let next = state + 0x6D2B79F5
  next = Math.imul(next ^ (next >>> 15), next | 1)
  next ^= next + Math.imul(next ^ (next >>> 7), next | 61)
  return [next >>> 0, ((next ^ (next >>> 14)) >>> 0) / 4294967296]
}

export function shuffledQuizOptions(
  options: Record<string, string>,
  seed: string,
): Array<{ label: string; text: string }> {
  const items = quizOptions(options)
  let state = hashSeed(seed)
  for (let index = items.length - 1; index > 0; index -= 1) {
    const result = nextRandom(state)
    state = result[0]
    const swapIndex = Math.floor(result[1] * (index + 1))
    const current = items[index]
    items[index] = items[swapIndex]
    items[swapIndex] = current
  }
  return items
}

const DISPLAY_KEYS = ['A', 'B', 'C', 'D'] as const

export function relabeledQuizOptions(
  options: Record<string, string>,
  seed: string,
): Array<{ label: string; originalLabel: string; text: string }> {
  return shuffledQuizOptions(options, seed).map((option, index) => ({
    label: DISPLAY_KEYS[index] ?? option.label,
    originalLabel: option.label,
    text: option.text,
  }))
}

export function quizImageUrls(imageUrls: string[] | null | undefined): string[] {
  return Array.isArray(imageUrls) ? imageUrls.filter(url => typeof url === 'string' && url.trim() !== '') : []
}

export function quizTypeLabel(type: QuizQuestionType): string {
  if (type === 'multiple_choice') return '多选题'
  if (type === 'judge') return '判断题'
  return '单选题'
}

export function isMultipleChoice(type: QuizQuestionType): boolean {
  return type === 'multiple_choice'
}

export function answerIncludes(answer: QuizAnswer | null | undefined, label: string): boolean {
  return typeof answer === 'string' ? answer === label : Array.isArray(answer) && answer.includes(label)
}

export function answerText(answer: QuizAnswer | null | undefined): string {
  if (answer === null || answer === undefined) return '未作答'
  return typeof answer === 'string' ? answer : answer.join('、')
}
