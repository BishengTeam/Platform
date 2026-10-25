import assert from 'node:assert/strict'
import test from 'node:test'
import { relabeledAnswerText, relabeledQuizOptions } from '../src/utils/quizView.ts'

const OPTIONS = { A: 'sfavtray.exe 中台守护进程', B: 'sfupdatemgr.exe 升级管理进程', C: 'ipc_proxy.exe 通信进程', D: 'abs_deployer.exe 绿色逃生进程' }

test('单选答案字母翻译为乱序后的显示字母，与选项行展示一致', () => {
  const seed = '110:458:29'
  const rows = relabeledQuizOptions(OPTIONS, seed)
  assert.equal(rows.some(row => row.label !== row.originalLabel), true, '测试数据本身应发生乱序重标')
  for (const row of rows) {
    assert.equal(relabeledAnswerText(row.originalLabel, OPTIONS, seed), row.label)
  }
})

test('多选答案逐个翻译并按显示字母排序', () => {
  const seed = 'seed-mc'
  const rows = relabeledQuizOptions(OPTIONS, seed)
  const originalAnswer = ['A', 'D']
  const expected = originalAnswer
    .map(label => rows.find(row => row.originalLabel === label).label)
    .sort()
    .join('、')
  assert.equal(relabeledAnswerText(originalAnswer, OPTIONS, seed), expected)
})

test('非字母答案（填空/排序文本、配对组、自由文本）原样输出', () => {
  assert.equal(relabeledAnswerText(['北京', '上海'], OPTIONS, 'seed'), '北京、上海')
  assert.equal(relabeledAnswerText([['甲', '乙'], ['丙', '丁']], OPTIONS, 'seed'), '空1：甲 / 乙；空2：丙 / 丁')
  assert.equal(relabeledAnswerText('自由作答内容', OPTIONS, 'seed'), '自由作答内容')
})

test('未作答与非选项字母保持原输出', () => {
  assert.equal(relabeledAnswerText(null, OPTIONS, 'seed'), '未作答')
  assert.equal(relabeledAnswerText('Z', OPTIONS, 'seed'), 'Z')
})
