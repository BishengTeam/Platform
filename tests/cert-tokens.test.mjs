import assert from 'node:assert/strict'
import test from 'node:test'
import { access, readFile } from 'node:fs/promises'

function luminance(hex) {
  const value = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map(index => parseInt(value.slice(index, index + 2), 16) / 255)
  const channel = c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(a, b) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (high + 0.05) / (low + 0.05)
}

async function tokens() {
  const scss = await readFile('src/styles/_variables.scss', 'utf8')
  const read = name => scss.match(new RegExp(`${name.replace('$', '\\$')}:\\s*(#[0-9a-fA-F]{6})`))?.[1]
  return { muted: read('$cert-text-muted'), primary: read('$cert-text-primary'), secondary: read('$cert-text-secondary') }
}

test('certification text tokens meet WCAG AA on white and page background', async () => {
  const { muted, primary, secondary } = await tokens()
  for (const background of ['#ffffff', '#f5f7fb']) {
    assert.ok(contrast(muted, background) >= 4.5, `muted on ${background}: ${contrast(muted, background)}`)
    assert.ok(contrast(secondary, background) >= 4.5, `secondary on ${background}`)
    assert.ok(contrast(primary, background) >= 7, `primary on ${background}`)
  }
})

test('pressable links meet touch and accessibility requirements across certification flows', async () => {
  const [component, style, journey, registrations, summary] = await Promise.all([
    readFile('src/components/PressableLink/index.tsx', 'utf8'),
    readFile('src/components/PressableLink/index.module.scss', 'utf8'),
    readFile('src/components/CertificationEnrollment/JourneyPanel.tsx', 'utf8'),
    readFile('src/pages/mine/registrations.tsx', 'utf8'),
    readFile('src/components/CertificationEnrollment/ConfirmationSummary.tsx', 'utf8'),
  ])
  assert.match(component, /aria-role='button'/)
  assert.match(component, /aria-label=/)
  assert.match(style, /min-height: \$touch-min/)
  assert.match(style, /:active/)
  assert.match(journey, /<PressableLink/)
  assert.match(registrations, /<PressableLink/)
  assert.match(summary, /<PressableLink/)
})

test('touch target token compiles to 88rpx (≈44 CSS px at 750 design width)', async () => {
  const variables = await readFile('src/styles/_variables.scss', 'utf8')
  assert.match(variables, /\$touch-min:\s*88rpx/)

  // 若本地已构建，额外校验编译产物中的真实单位，防止 px→rpx 转换再次减半。
  for (const file of ['dist/common.wxss', 'dist/pages/h3c/exam-booking/index.wxss']) {
    try {
      await access(file)
    } catch {
      continue
    }
    const css = await readFile(file, 'utf8')
    assert.match(css, /min-height:\s*88rpx/, `${file} should contain 88rpx touch targets`)
  }
})

test('remaining certification surfaces use semantic tokens', async () => {
  const [booking, mine, sangfor, shared] = await Promise.all([
    readFile('src/pages/h3c/exam-booking/index.module.scss', 'utf8'),
    readFile('src/pages/mine/registrations.module.scss', 'utf8'),
    readFile('src/pages/sangfor/sangfor.module.scss', 'utf8'),
    readFile('src/components/CertificationEnrollment/index.module.scss', 'utf8'),
  ])
  assert.match(booking, /\.detailLabel\s*\{[\s\S]*?color: \$cert-text-muted/)
  assert.match(booking, /\.detailValue\s*\{[\s\S]*?color: \$cert-text-primary/)
  assert.match(mine, /\.card\s*\{[\s\S]*?box-shadow: \$cert-card-shadow/)
  assert.match(mine, /\.sourceError\s*\{[\s\S]*?color: \$cert-danger-strong/)
  assert.match(sangfor, /\.blockReason\s*\{[\s\S]*?color: \$cert-danger-strong/)
  assert.match(shared, /min-height: 100dvh/)
})
