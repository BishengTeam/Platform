import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('course service uses the frozen chapter playback contract', async () => {
  const source = await readFile('src/services/courseService.ts', 'utf8')
  assert.match(source, /\/api\/courses\/\$\{courseId\}\/chapters/)
  assert.match(source, /\/api\/courses\/\$\{courseId\}\/chapters\/\$\{chapterId\}\/playback-url/)
  assert.doesNotMatch(source, /course-assets/)
  assert.doesNotMatch(source, /free_preview_seconds/)
})

test('course DTO hides storage keys and exposes preview semantics', async () => {
  const source = await readFile('src/types/course.ts', 'utf8')
  assert.match(source, /preview_chapter_count: number/)
  assert.match(source, /can_play: boolean/)
  assert.doesNotMatch(source, /video_storage_key/)
  assert.doesNotMatch(source, /video_url/)
})

test('my courses navigates with the course id instead of enrollment id', async () => {
  const source = await readFile('src/services/courseService.ts', 'utf8')
  assert.match(source, /course\?: \{\s*\n\s*id\?: number/)
  assert.match(source, /id: String\(item\.course\?\.id \?\? item\.id\)/)
})
