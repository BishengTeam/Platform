import { get, post } from '@/utils/request'
import type { ClassroomDetail, ClassroomMyItem, ClassroomQuizPaper, ClassroomQuizResult } from '@/types/classroom'

/** POST /api/classroom/join — 课堂码加入（需实名） */
export async function joinClassroom(code: string): Promise<{ classroom_id: number; name: string }> {
  const res = await post<{ classroom_id: number; name: string }>('/api/classroom/join', { code })
  return res.data
}

/** GET /api/classroom/my — 我的课堂（仅进行中） */
export async function getMyClassrooms(): Promise<ClassroomMyItem[]> {
  const res = await get<{ items?: ClassroomMyItem[] }>('/api/classroom/my')
  return res.data?.items ?? []
}

/** GET /api/classroom/{id} — 详情（视频+测验） */
export async function getClassroomDetail(id: number): Promise<ClassroomDetail> {
  const res = await get<ClassroomDetail>(`/api/classroom/${id}`)
  return res.data
}

/** GET /api/classroom/videos/{id}/play-url */
export async function getVideoPlayUrl(videoId: number): Promise<string> {
  const res = await get<{ url: string }>(`/api/classroom/videos/${videoId}/play-url`)
  return res.data.url
}

/** GET /api/classroom/quizzes/{id}/paper */
export async function getQuizPaper(quizId: number): Promise<ClassroomQuizPaper> {
  const res = await get<ClassroomQuizPaper>(`/api/classroom/quizzes/${quizId}/paper`)
  return res.data
}

/** POST /api/classroom/quizzes/{id}/submit */
export async function submitQuiz(quizId: number, answers: Record<string, string>): Promise<void> {
  await post(`/api/classroom/quizzes/${quizId}/submit`, { answers })
}

/** GET /api/classroom/quizzes/{id}/result */
export async function getQuizResult(quizId: number): Promise<ClassroomQuizResult> {
  const res = await get<ClassroomQuizResult>(`/api/classroom/quizzes/${quizId}/result`)
  return res.data
}
