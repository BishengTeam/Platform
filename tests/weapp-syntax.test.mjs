import assert from 'node:assert/strict'
import test from 'node:test'
import { checkWeappScript } from '../scripts/check-weapp-syntax.mjs'

test('generated CSS binding cannot redeclare WeChat document even though standalone JS parses', () => {
  const generated = 'const document = "index-module__document___hash"; exports.styles = { document };'
  assert.doesNotThrow(() => new Function(generated))
  assert.throws(() => checkWeappScript(generated, 'common.js'), /common\.js: Identifier 'document' has already been declared/)
})

test('renamed CSS binding and local document variables remain valid in the WeChat wrapper', () => {
  const generated = 'const documentActions = "css-class"; exports.styles = { documentActions }; function getFile() { const document = {}; return document; }'
  assert.doesNotThrow(() => checkWeappScript(generated, 'common.js'))
})

test('check validates syntax without executing native APIs or the application', () => {
  assert.doesNotThrow(() => checkWeappScript('const wxApi = require("native"); throw new Error("must not execute");', 'app.js'))
  assert.throws(() => checkWeappScript('const broken = ;', 'app.js'), /app\.js:/)
})
