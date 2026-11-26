import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

// 报名/补正页的「版本已变化」守卫不能把页面锁死：
// 旧实现只 setBatchCheckError('报名版本已变化，请返回报名详情重新进入') 后 return，
// 而「刷新批次状态」重新比对的是本地旧版本，永远清不掉错误——用户改完资料也提交不了，
// 只能退出页面重新进入。现在必须直接采纳服务端最新状态。
for (const [page, path, adopt] of [
  ['人社报名表单', 'src/pages/renshe/form.tsx', /setApplication\(latestApplication\)/],
  ['深信服报名表单', 'src/pages/sangfor/form.tsx', /setRegistration\(latest\)/],
]) {
  test(`${page}在报名版本变化时采纳最新状态而不是锁死页面`, async () => {
    const source = await readFile(path, 'utf8')
    assert.doesNotMatch(source, /setBatchCheckError\('报名版本已变化/)
    assert.match(source, /报名版本已更新，已载入最新状态/)
    assert.match(source, adopt)
  })
}
