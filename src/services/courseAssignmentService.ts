import { get, post, put } from '@/utils/request'
import {
  parseCourseAssignmentAnswerSaved,
  parseCourseAssignmentDetail,
  parseCourseAssignmentList,
  parseCourseAssignmentSubmitResult,
  parseCourseAssignmentWithdrawResult,
} from '@/contracts/courseAssignment'
import type { CourseAssignmentAnswer } from '@/contracts/courseAssignment'

const BASE = '/api/course-assignments'

export async function listCourseAssignments(courseId?: number) {
  const response = await get<unknown>(BASE, courseId ? { course_id: courseId } : undefined)
  return parseCourseAssignmentList(response.data)
}

export async function startCourseAssignment(assignmentId: number) {
  const response = await post<unknown>(`${BASE}/${assignmentId}/start`)
  return parseCourseAssignmentDetail(response.data)
}

export async function getCourseAssignment(assignmentId: number) {
  const response = await get<unknown>(`${BASE}/${assignmentId}`)
  return parseCourseAssignmentDetail(response.data)
}

export async function saveCourseAssignmentAnswers(
  assignmentId: number,
  answers: Array<{ question_id: number; user_answer: CourseAssignmentAnswer | null }>,
) {
  const response = await put<unknown>(`${BASE}/${assignmentId}/answers`, { answers })
  return parseCourseAssignmentAnswerSaved(response.data)
}

export async function submitCourseAssignment(assignmentId: number) {
  const response = await post<unknown>(`${BASE}/${assignmentId}/submit`)
  return parseCourseAssignmentSubmitResult(response.data)
}

export async function withdrawCourseAssignment(assignmentId: number) {
  const response = await post<unknown>(`${BASE}/${assignmentId}/withdraw`)
  return parseCourseAssignmentWithdrawResult(response.data)
}
