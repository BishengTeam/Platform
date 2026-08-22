import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('tag filter keeps one transform-driven underline indicator mounted', async () => {
  const source = await readFile('src/components/TagFilter/index.tsx', 'utf8')
  const styles = await readFile('src/components/TagFilter/index.module.scss', 'utf8')

  assert.match(source, /styles\.underlineIndicator/)
  assert.match(source, /transform: `translateX\(/)
  assert.doesNotMatch(source, /\{isActive && <View className=\{styles\.underlineIndicator\}/)
  assert.match(source, /underlineIndicatorReady/)
  assert.match(styles, /\.underlineIndicatorReady\s*\{[\s\S]*?transition:\s*\n?\s*transform \$motion-duration-press \$motion-ease-out/)
  assert.match(styles, /\.underlineIndicatorReady\s*\{[\s\S]*?transition: opacity \$motion-duration-state ease-out/)
})

test('orders page keeps one transform-driven tab indicator mounted', async () => {
  const source = await readFile('src/pages/orders/index.tsx', 'utf8')
  const styles = await readFile('src/pages/orders/index.module.scss', 'utf8')

  assert.match(source, /className=\{styles\.tabIndicator\}/)
  assert.match(source, /transform: `translateX\(\$\{activeIndex \* 100\}%\)`/)
  assert.doesNotMatch(source, /\{isActive && <View className=\{styles\.tabIndicator\}/)
  assert.match(styles, /left: \$spacing-sm;/)
  assert.match(styles, /width: calc\(\(100% - #\{\$spacing-sm \* 2\}\) \/ 4\)/)
  assert.match(styles, /\.tabIndicator\s*\{[\s\S]*?transition: transform \$motion-duration-press \$motion-ease-out/)
  assert.match(styles, /\.tabIndicator\s*\{[\s\S]*?transition: none/)
})
