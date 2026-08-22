import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

async function readScssFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(entries.map(async entry => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) return readScssFiles(fullPath)
    return entry.name.endsWith('.scss') ? [fullPath] : []
  }))
  return files.flat()
}

test('app typography follows the user text-size setting', async () => {
  const app = await readFile('src/app.tsx', 'utf8')
  const variables = await readFile('src/styles/_variables.scss', 'utf8')
  const appStyles = await readFile('src/app.scss', 'utf8')

  assert.match(app, /fontSizeSetting/)
  assert.match(app, /--app-font-scale/)
  assert.match(appStyles, /--app-font-scale: 1/)
  assert.match(appStyles, /font-size: calc\(28px \* var\(--app-font-scale\)\)/)
  assert.match(variables, /\$font-base: calc\(28px \* var\(--app-font-scale\)\)/)
  assert.match(variables, /\$leading-display: 1\.05/)
  assert.match(variables, /\$tracking-display: -0\.02em/)

  const files = await readScssFiles('src')
  const fixedFontSizes = []
  for (const file of files) {
    const source = await readFile(file, 'utf8')
    if (/font-size: \d+(?:\.\d+)?px/.test(source)) fixedFontSizes.push(file)
  }
  assert.deepEqual(fixedFontSizes, [])
})

test('floating service carries gesture momentum and resists soft boundaries', async () => {
  const source = await readFile('src/components/FloatingService/index.tsx', 'utf8')

  assert.match(source, /function rubberBand\(/)
  assert.match(source, /function softBound\(/)
  assert.match(source, /function projectVelocity\(/)
  assert.match(source, /DECELERATION_RATE = 0\.998/)
  assert.match(source, /SPRING_DAMPING_RATIO = 0\.8/)
  assert.match(source, /SPRING_RESPONSE_SECONDS = 0\.3/)
  assert.match(source, /scheduleFrame\(step\)/)
  assert.match(source, /requestAnimationFrame/)
  assert.match(source, /vibrateShort/)
  assert.match(source, /prefers-reduced-motion/)
})

test('floating chrome uses materials, safe area, and accessibility fallbacks', async () => {
  const header = await readFile('src/components/PageHeader/index.module.scss', 'utf8')
  const tabBar = await readFile('src/components/TabBar/index.module.scss', 'utf8')

  assert.match(header, /backdrop-filter: blur\(20px\) saturate\(180%\)/)
  assert.match(header, /prefers-reduced-transparency: reduce/)
  assert.match(header, /prefers-contrast: more/)
  assert.match(tabBar, /calc\(128px \+ #\{\$safe-bottom\}\)/)
  assert.match(tabBar, /backdrop-filter: blur\(20px\) saturate\(180%\)/)
  assert.match(tabBar, /prefers-reduced-transparency: reduce/)
  assert.match(tabBar, /prefers-contrast: more/)
})

test('primary controls meet the minimum touch target', async () => {
  const header = await readFile('src/components/PageHeader/index.module.scss', 'utf8')
  const aiConsult = await readFile('src/pages/ai-consult/index.module.scss', 'utf8')

  assert.match(header, /\.side\s*\{[\s\S]*?width: \$touch-min/)
  assert.match(header, /\.backBtn\s*\{[\s\S]*?width: \$touch-min[\s\S]*?height: \$touch-min/)
  assert.match(aiConsult, /\.backBtn\s*\{[\s\S]*?width: \$touch-min[\s\S]*?height: \$touch-min/)
})

test('payment evidence uses legible contrast and meaningful haptics are restrained', async () => {
  const result = await readFile('src/pages/payment/result.module.scss', 'utf8')
  const resultPage = await readFile('src/pages/payment/result.tsx', 'utf8')
  const deactivate = await readFile('src/pages/mine/deactivate.tsx', 'utf8')

  assert.doesNotMatch(result, /#999999/)
  assert.match(result, /#595959/)
  assert.match(resultPage, /vibrateShort\(\{ type: 'light' \}\)/)
  assert.match(deactivate, /vibrateShort\(\{ type: 'medium' \}\)/)
})
