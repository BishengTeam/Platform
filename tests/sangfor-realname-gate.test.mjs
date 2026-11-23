import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const PAGE = 'src/pages/sangfor/form.tsx'

test('未实名时阻断横幅直接给「去实名」，不再让人点刷新状态', async () => {
  const source = await readFile(PAGE, 'utf8')

  // 实名未通过时按钮文案与跳转目标
  assert.match(
    source,
    /!identity\.verified\s*\?\s*<Button[^>]*onClick=\{\(\) => void Taro\.navigateTo\(\{ url: `\/\$\{ROUTES\.MINE_EDIT_PROFILE\}` \}\)\}>去实名<\/Button>/,
  )
  // 刷新状态只在实名通过后出现（且非终态阻断）
  assert.match(
    source,
    /: !terminalBlocked && <Button[^>]*onClick=\{\(\) => void refreshAvailability\(\)\}>刷新状态<\/Button>/,
  )
})

test('从个人资料页返回后重新拉取实名状态，首次展示不重复请求', async () => {
  const source = await readFile(PAGE, 'utf8')

  assert.match(source, /import Taro, \{ useDidShow, useLoad \} from '@tarojs\/taro'/)
  assert.match(source, /const shownOnce = useRef\(false\)/)
  assert.match(
    source,
    /useDidShow\(\(\) => \{[\s\S]*if \(!shownOnce\.current\) \{ shownOnce\.current = true; return \}[\s\S]*getUserProfile\(\)[\s\S]*setIdentity\(/,
  )
})
