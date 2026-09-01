import type { QuizAnswer, QuizCorrectAnswer, QuizQuestionType } from '@/contracts/quiz'

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
  if (type === 'fill_blank') return '填空题'
  if (type === 'essay') return '问答题'
  return '单选题'
}

export function isMultipleChoice(type: QuizQuestionType): boolean {
  return type === 'multiple_choice'
}

export function answerIncludes(answer: QuizAnswer | QuizCorrectAnswer | null | undefined, label: string): boolean {
  if (typeof answer === 'string') return answer === label
  if (!Array.isArray(answer)) return false
  // Fill-blank candidate groups never match an option label.
  return answer.every(item => typeof item === 'string') && (answer as string[]).includes(label)
}

export function answerText(answer: QuizAnswer | QuizCorrectAnswer | null | undefined): string {
  if (answer === null || answer === undefined) return '未作答'
  if (Array.isArray(answer) && answer.length > 0 && answer.every(group => Array.isArray(group))) {
    return (answer as string[][]).map((group, index) => `空${index + 1}：${group.join(' / ')}`).join('；')
  }
  return typeof answer === 'string' ? answer : answer.join('、')
}

export function isFillBlank(type: QuizQuestionType): boolean {
  return type === 'fill_blank'
}

export function isEssay(type: QuizQuestionType): boolean {
  return type === 'essay'
}

export function fillBlankCount(questionText: string): number {
  const matches = questionText.match(/_{4,}/g)
  return matches ? matches.length : 0
}

export function fillBlankCandidateGroups(correct: QuizCorrectAnswer | null | undefined): string[][] {
  if (!Array.isArray(correct) || correct.length === 0) return []
  if (!correct.every(group => Array.isArray(group))) return []
  return correct as string[][]
}

export function fillBlankBlankResults(
  userAnswer: QuizAnswer | null | undefined,
  correct: QuizCorrectAnswer | null | undefined,
): Array<{ value: string; candidates: string[]; correct: boolean }> {
  const groups = fillBlankCandidateGroups(correct)
  const answers = Array.isArray(userAnswer) && userAnswer.every(item => typeof item === 'string')
    ? userAnswer
    : groups.map(() => '')
  return groups.map((candidates, index) => {
    const value = answers[index] ?? ''
    return { value, candidates, correct: candidates.includes(value) }
  })
}

export function correctAnswerText(correct: QuizCorrectAnswer | null | undefined): string {
  if (correct === null || correct === undefined) return '未作答'
  const groups = fillBlankCandidateGroups(correct)
  if (groups.length > 0) {
    return groups.map((group, index) => `空${index + 1}：${group.join(' / ')}`).join('；')
  }
  return typeof correct === 'string' ? correct : correct.join('、')
}

export function reviewVerdictLabel(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined) return '待评阅'
  if (ratio >= 1) return '满分'
  if (ratio > 0) return '半对'
  return '不得分'
}
