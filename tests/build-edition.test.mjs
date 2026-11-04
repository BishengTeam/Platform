import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('生产构建统一 full，且不再提供 trim 快捷构建入口', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const env = await readFile(new URL('../.env.production', import.meta.url), 'utf8')
  assert.equal(pkg.scripts['build:weapp'].endsWith('npm run check:weapp'), true)
  assert.equal('build:weapp:trim' in pkg.scripts, false)
  assert.equal('dev:weapp:trim' in pkg.scripts, false)
  assert.match(pkg.scripts['check:weapp'], /check-weapp-edition/)
  assert.match(env, /^TARO_APP_HOME_CERT_ENTRY_VISIBLE=true$/m)
})
