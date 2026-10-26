import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import React from 'react'
import * as runtime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { getHomeQuickEntries } from '../src/constants/homeEntries.ts'
import { FEATURES_FULL } from '../src/constants/features.full.ts'
import { FEATURES_TRIM } from '../src/constants/features.trim.ts'

function compile(file, require, env = {}) {
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  const output = { exports: {} }
  new Function('require', 'module', 'exports', 'process', '__dirname', 'console', code)(
    require, output, output.exports, { env }, fileURLToPath(new URL('../config/', import.meta.url)), { log() {} },
  )
  return output.exports
}

async function buildFlags(mode, env = {}) {
  const config = compile('../config/index.ts', name => {
    if (name === 'path') return path
    if (name === '@tarojs/cli') return { defineConfig: factory => factory }
    if (name === './dev' || name === './prod') return {}
    throw new Error(`Unexpected config dependency: ${name}`)
  }, env).default
  const resolved = await config((...configs) => Object.assign({}, ...configs), { command: 'build', mode })
  const flags = compile('../src/constants/features.ts', name => {
    if (name === './features.full.ts') return { FEATURES_FULL }
    if (name === './features.trim.ts') return { FEATURES_TRIM }
    throw new Error(`Unexpected flags dependency: ${name}`)
  }, Object.fromEntries(Object.entries(resolved.defineConstants).map(([key, value]) => [key.replace('process.env.', ''), JSON.parse(value)])))
  return flags
}

for (const edition of ['full', 'trim']) {
  test(`production ${edition} hides the shortcut even with a development override, without changing business flags`, async () => {
    const flags = await buildFlags('production', { TARO_EDITION: edition, TARO_APP_HOME_CERT_ENTRY_VISIBLE: 'true' })
    assert.equal(flags.homeCertEntryVisible, false)
    assert.deepEqual(flags.FEATURES, edition === 'trim' ? FEATURES_TRIM : FEATURES_FULL)
  })
}

test('development only shows the shortcut when explicitly enabled', async () => {
  for (const value of [undefined, 'false', '1', 'TRUE']) {
    assert.equal((await buildFlags('development', { TARO_APP_HOME_CERT_ENTRY_VISIBLE: value })).homeCertEntryVisible, false)
  }
  assert.equal((await buildFlags('development', { TARO_APP_HOME_CERT_ENTRY_VISIBLE: 'true' })).homeCertEntryVisible, true)
})

const host = tag => ({ children, ...props }) => React.createElement(tag, props, children)
const { KingKongZone } = compile('../src/components/KingKongZone/index.tsx', name => {
  if (name === 'react') return React
  if (name === 'react/jsx-runtime') return runtime
  if (name === '@tarojs/components') return { View: host('div'), Text: host('span') }
  if (name === '@/components/Icon') return { Icon: () => null }
  if (name.endsWith('.scss')) return new Proxy({}, { get: (_, key) => key === '__esModule' ? false : key })
  throw new Error(`Unexpected grid dependency: ${name}`)
})

for (const hasActivities of [false, true]) {
  test(`production shortcuts render ${hasActivities ? 'three' : 'two'} real entries without certification or empty placeholders`, async () => {
    const flags = await buildFlags('production')
    const items = getHomeQuickEntries({ ...flags, certRegistration: flags.FEATURES.certRegistration, hasActivities })
    assert.equal(items.length, hasActivities ? 3 : 2)
    assert.equal(items.every(item => item.url && !item.comingSoon), true)
    assert.deepEqual(items.map(item => [item.url, item.tab]), [
      ['/pages/training/index', undefined], ['/pages/activity-zone/index', 'competition'],
      ...(hasActivities ? [['/pages/activity-zone/index', 'activity']] : []),
    ])
    const html = renderToStaticMarkup(React.createElement(KingKongZone, { items, columns: items.length === 3 ? 3 : 2 }))
    assert.match(html, new RegExp(`grid-template-columns:repeat\\(${items.length}, 1fr\\)`))
    assert.equal((html.match(/data-index=/g) || []).length, items.length)
    assert.doesNotMatch(html, /认证专区|敬请期待|开发中/)
  })
}

test('development shortcut follows the independent display switch and does not enable disabled certification business', () => {
  const options = { homeCertEntryVisible: true, certRegistration: true, hasActivities: false }
  assert.equal(getHomeQuickEntries(options)[0].url, '/pages/registration/index')
  assert.equal(getHomeQuickEntries({ ...options, certRegistration: false }).length, 2)
})
