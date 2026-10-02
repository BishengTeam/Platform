import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  formatTicketTime,
  parseTicketImages,
  parseTicketType,
  ticketStatusMeta,
  ticketSummary,
} from '../src/utils/ticketView.ts'

const feedbackContent = [
  '【意见反馈】',
  '类型：功能异常',
  '说明：支付结果页一直转圈，无法返回课程列表。',
  '图片：/api/media/a01.jpg,/api/media/b02.png',
].join('\n')

const quizContent = [
  '【题目反馈】',
  '题目ID：1024',
  '题目：HTTP 默认端口是多少？',
  '说明：答案标注有误。',
].join('\n')

test('ticket type is parsed from the protocol header', () => {
  assert.deepEqual(parseTicketType(feedbackContent), { key: 'feedback', label: '意见反馈' })
  assert.deepEqual(parseTicketType(quizContent), { key: 'quiz', label: '题目反馈' })
  assert.deepEqual(parseTicketType('普通的客服咨询'), { key: 'general', label: '咨询' })
  assert.deepEqual(parseTicketType(null), { key: 'general', label: '咨询' })
})

test('ticket summary prefers quiz title and feedback description', () => {
  assert.equal(ticketSummary(feedbackContent), '支付结果页一直转圈，无法返回课程列表。')
  assert.equal(ticketSummary(quizContent), 'HTTP 默认端口是多少？')
  assert.equal(ticketSummary('第一行\n第二行'), '第一行')
  assert.equal(ticketSummary(null), '')
})

test('ticket images only accept media image urls and deduplicate', () => {
  assert.deepEqual(parseTicketImages(feedbackContent), ['/api/media/a01.jpg', '/api/media/b02.png'])
  assert.deepEqual(
    parseTicketImages('【意见反馈】\n图片：/api/media/a.zip，/api/media/a.jpg,/api/media/a.jpg,https://evil.example/b.png'),
    ['/api/media/a.jpg'],
  )
  assert.deepEqual(parseTicketImages('【意见反馈】\n说明：no images'), [])
})

test('ticket status maps to display label and tone', () => {
  assert.deepEqual(ticketStatusMeta('waiting_manual'), { label: '待处理', tone: 'pending' })
  assert.deepEqual(ticketStatusMeta('processing'), { label: '处理中', tone: 'processing' })
  assert.deepEqual(ticketStatusMeta('resolved'), { label: '已解决', tone: 'resolved' })
  assert.deepEqual(ticketStatusMeta('custom'), { label: 'custom', tone: 'pending' })
})

test('ticket time hides the current year and keeps historical years', () => {
  const currentYear = new Date().getFullYear()
  assert.equal(formatTicketTime(`${currentYear}-10-02T03:53:12`), '10-02 03:53')
  assert.equal(formatTicketTime('2024-12-31T23:59:59'), '2024-12-31 23:59')
  assert.equal(formatTicketTime('not-a-time'), 'not-a-time')
  assert.equal(formatTicketTime(null), '')
})

test('service page renders the redesigned ticket list contract', async () => {
  const [pageSource, styleSource, configSource] = await Promise.all([
    readFile(new URL('../src/pages/service/index.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/service/index.module.scss', import.meta.url), 'utf8'),
    readFile(new URL('../config/index.ts', import.meta.url), 'utf8'),
  ])

  assert.match(pageSource, /parseTicketType\(ticket\.content\)/)
  assert.match(pageSource, /ticketSummary\(ticket\.content\)/)
  assert.match(pageSource, /parseTicketImages\(ticket\.content\)\.length/)
  assert.match(pageSource, /formatTicketTime\(ticket\.created_at\)/)
  assert.match(pageSource, /SERVICE_TICKET_DETAIL/)
  assert.match(pageSource, /getTicketDetail\(ticket\.id\)/)
  assert.doesNotMatch(pageSource, /\{ticket\.created_at\}/)
  assert.match(styleSource, /-webkit-line-clamp: 2/)
  assert.match(styleSource, /\$page-bg: #F7F8FA/)
  assert.match(styleSource, /\$card-border: #F1F5F9/)
  assert.match(styleSource, /border: \$border-thin solid \$card-border/)
  assert.match(pageSource, /showMenuByLongpress/)
  assert.match(pageSource, /SERVICE_ACTION_QR/)
  assert.match(pageSource, /\/assets\/service\/wechat-kefu-qr\.png/)
  assert.match(configSource, /src\/assets\/service\/.*dist\/assets\/service\//)
})
