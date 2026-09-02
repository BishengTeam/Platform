import { get, post, del } from '@/utils/request'
import type {
  ClassroomAttachmentItem,
  ClassroomAttachmentUploadTarget,
  ClassroomDetail,
  ClassroomMyItem,
  ClassroomQuizPaper,
  ClassroomQuizResult,
  ClassroomSubmissionDetail,
} from '@/types/classroom'

/** POST /api/classroom/join — 课堂码加入（需实名） */
export async function joinClassroom(code: string): Promise<{ classroom_id: number; name: string }> {
  const normalizedCode = String(code).trim()
  const res = await post<{ classroom_id: number; name: string }>('/api/classroom/join', {
    code: normalizedCode,
  })
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

/** POST /api/classroom/quizzes/{id}/submit — short 为富文本 HTML，附件显式绑定 */
export async function submitQuiz(
  quizId: number,
  answers: Record<string, string>,
  attachments: Record<string, number[]> = {},
): Promise<void> {
  await post(`/api/classroom/quizzes/${quizId}/submit`, { answers, attachments })
}

/** GET /api/classroom/quizzes/{id}/result */
export async function getQuizResult(quizId: number): Promise<ClassroomQuizResult> {
  const res = await get<ClassroomQuizResult>(`/api/classroom/quizzes/${quizId}/result`)
  return res.data
}

/** POST /api/classroom/quizzes/{id}/attachments/upload-url */
export async function createClassroomAttachmentUpload(
  quizId: number,
  questionId: number,
  filename: string,
  contentType: string,
  sizeBytes: number,
): Promise<ClassroomAttachmentUploadTarget> {
  const res = await post<ClassroomAttachmentUploadTarget>(
    `/api/classroom/quizzes/${quizId}/attachments/upload-url`,
    { question_id: questionId, filename, content_type: contentType, size_bytes: sizeBytes },
  )
  return res.data
}

/** GET /api/classroom/quizzes/{id}/attachments — 草稿附件（答题页恢复） */
export async function getClassroomAttachments(quizId: number): Promise<ClassroomAttachmentItem[]> {
  const res = await get<ClassroomAttachmentItem[]>(`/api/classroom/quizzes/${quizId}/attachments`)
  return res.data ?? []
}

/** DELETE /api/classroom/quizzes/{id}/attachments/{attachmentId} */
export async function deleteClassroomAttachment(quizId: number, attachmentId: number): Promise<void> {
  await del(`/api/classroom/quizzes/${quizId}/attachments/${attachmentId}`)
}

/** GET /api/classroom/quizzes/{id}/submission — 提交详情回看（approved 后含内容） */
export async function getClassroomSubmissionDetail(quizId: number): Promise<ClassroomSubmissionDetail> {
  const res = await get<ClassroomSubmissionDetail>(`/api/classroom/quizzes/${quizId}/submission`)
  return res.data
}
