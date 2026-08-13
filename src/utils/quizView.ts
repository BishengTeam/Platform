import type { QuizAnswer, QuizQuestionType } from '@/contracts/quiz'

export function quizOptions(options: Record<string, string>): Array<{ label: string; text: string }> {
  return Object.entries(options)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, text]) => ({ label, text }))
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
