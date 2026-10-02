import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const file = (p) => new URL(`../${p}`, import.meta.url)

test('auth cover follows the Zhiyouxue brand system', async () => {
  const [strings, source, style] = await Promise.all([
    readFile(file('src/constants/strings.ts'), 'utf8'),
    readFile(file('src/pages/auth/index.tsx'), 'utf8'),
    readFile(file('src/pages/auth/index.module.scss'), 'utf8'),
  ])

  assert.match(strings, /AUTH_APP_NAME: '智优学'/)
  assert.match(strings, /AUTH_APP_SUBTITLE: 'IT 职业认证在线学习平台'/)
  assert.match(source, /styles\.brand/)
  assert.match(source, /STRINGS\.AUTH_APP_SUBTITLE/)
  assert.match(source, /styles\.actions/)
  assert.match(source, /styles\.agreementRow/)
  assert.doesNotMatch(source, /STRINGS\.AUTH_APP_DESC/)
  assert.match(style, /\.brand\s*\{[^}]*margin-top:\s*146px/)
  assert.doesNotMatch(style, /\.loginCard/)

  assert.match(style, /\$auth-primary:\s*#1875D2/)
  assert.match(style, /\$auth-primary-deep:\s*#0B43A4/)
  assert.match(style, /\$auth-bg-start:\s*#F2F7FF/)
  assert.match(style, /linear-gradient\(135deg, \$auth-primary 0%, \$auth-primary-deep 100%\)/)
  assert.match(style, /display:\s*grid/)
  assert.match(style, /calc\(40px \+ #\{\$safe-bottom\}\)/)
  assert.doesNotMatch(style, /background:\s*\$color-success/)
})

test('auth cover logo ships with the mini program package', async () => {
  const config = await readFile(file('config/index.ts'), 'utf8')
  const logo = await readFile(file('src/assets/logo/zhi-tian-yuan.svg'), 'utf8')

  assert.match(config, /from: 'src\/assets\/logo\/', to: 'dist\/assets\/logo\/'/)
  assert.match(logo, /viewBox="0 0 6830 6306"/)
  assert.doesNotMatch(logo, /<text\b/i)
})
