import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('classroom attachment service hits the agreed endpoints', async () => {
  const source = await readFile('src/services/classroomService.ts', 'utf8')
  assert.match(source, /\/api\/classroom\/quizzes\/\$\{quizId\}\/attachments\/upload-url/)
  assert.match(source, /\/api\/classroom\/quizzes\/\$\{quizId\}\/attachments\/\$\{attachmentId\}/)
  assert.match(source, /\/api\/classroom\/quizzes\/\$\{quizId\}\/submission/)
  assert.match(source, /question_id: questionId, filename, content_type: contentType, size_bytes: sizeBytes/)
  assert.match(source, /await post\(`\/api\/classroom\/quizzes\/\$\{quizId\}\/submit`, \{ answers, attachments \}\)/)
})

test('classroom attachment DTO keeps kind/filename/size/url contract', async () => {
  const source = await readFile('src/types/classroom.ts', 'utf8')
  assert.match(source, /kind: ClassroomAttachmentKind/)
  assert.match(source, /filename: string/)
  assert.match(source, /size_bytes: number/)
  assert.match(source, /url: string/)
  assert.match(source, /status: 'pending_review' \| 'approved'/)
})

test('quiz page renders native editor with upload and grace submit', async () => {
  const source = await readFile('src/pages/classroom/quiz.tsx', 'utf8')
  assert.match(source, /<Editor/)
  assert.match(source, /insertEditorImage/)
  assert.match(source, /chooseMessageFile\(\{ count: 1, type: 'file', extension: \['doc', 'docx', 'zip'\] \}\)/)
  assert.match(source, /SUBMIT_UPLOAD_GRACE_MS = 30 \* 1000/)
  assert.match(source, /waitForUploads/)
  assert.match(source, /attachmentPayload\[qid\] = items\.map\(\(item\) => item\.id\)/)
  assert.doesNotMatch(source, /<Textarea/)
})

test('result page gates review behind grading state and renders rich text', async () => {
  const source = await readFile('src/pages/classroom/result.tsx', 'utf8')
  assert.match(source, /getClassroomSubmissionDetail/)
  assert.match(source, /detail\?\.status === 'pending_review'/)
  assert.match(source, /detail\?\.status === 'approved'/)
  assert.match(source, /<RichText/)
})

test('detail routes submitted quizzes to the result page', async () => {
  const source = await readFile('src/pages/classroom/detail.tsx', 'utf8')
  assert.match(source, /pages\/classroom\/result\?id=\$\{quizId\}/)
})

test('app config registers the classroom result page', async () => {
  const source = await readFile('src/app.config.ts', 'utf8')
  assert.match(source, /pages: \['join', 'detail', 'quiz', 'result'\]/)
})
