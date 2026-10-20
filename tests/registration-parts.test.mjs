import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { materialSources, currentWorkUnit } from '../src/utils/registrationMaterial.ts'

// Render the real presentation components; replace only the mini-program host elements.
const source = await readFile('src/components/RegistrationParts/index.tsx', 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
const output = { exports: {} }
const host = tag => ({ children, className, id }) => React.createElement(tag, { className, id }, children)
const mockedRequire = name => {
  if (name === 'react') return React
  if (name === 'react/jsx-runtime') return jsxRuntime
  if (name === '@tarojs/components') return { View: host('div'), Text: host('span') }
  if (name === '@tarojs/taro') return {}
  if (name === '../Button') return { Button: ({ children, disabled }) => React.createElement('button', { disabled }, children) }
  if (name.endsWith('.scss')) return new Proxy({}, { get: (_, key) => key === '__esModule' ? false : key })
  throw new Error(`Unexpected component dependency: ${name}`)
}
new Function('require', 'module', 'exports', compiled)(mockedRequire, output, output.exports)
const { MaterialItem, RegistrationSummary, RegistrationSubmitBar, RequirementDisclosure } = output.exports
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props))

test('material presentation distinguishes pending, uploaded, replacement, and failed states', () => {
  const pending = render(MaterialItem, { title: '毕业证', required: true, requirement: 'PDF', onUpload() {} })
  assert.match(pending, /待上传/)
  assert.match(pending, /上传材料/)
  const uploaded = render(MaterialItem, { title: '毕业证', requirement: 'PDF', file: { name: '本人毕业证.pdf', size: 204800 }, error: '替换失败，请重试', onUpload() {} })
  assert.match(uploaded, /本人毕业证\.pdf · 200 KB/)
  assert.match(uploaded, /替换材料/)
  assert.match(uploaded, /替换失败，请重试/)
  assert.match(render(MaterialItem, { title: '证件照', requirement: 'JPG', uploading: true, disabled: true, onUpload() {} }), /button disabled/)
})

test('summary renders real schedule, location, and fee rather than fixed certification values', () => {
  const html = render(RegistrationSummary, { title: '批次A', badge: '工龄型', priceCents: 12345, items: [{ label: '考试地点', value: '成都考点' }] })
  for (const text of ['批次A', '工龄型', '成都考点', '¥123.45']) assert.ok(html.includes(text))
})

test('correction and free-registration footers display the supplied action without another charge claim', () => {
  const correction = render(RegistrationSubmitBar, { priceCents: 10000, priceLabel: '本次补正', priceText: '无需重复支付', label: '提交补正', onSubmit() {} })
  assert.match(correction, /无需重复支付/)
  assert.doesNotMatch(correction, /¥100/)
  assert.match(render(RegistrationSubmitBar, { priceCents: 0, label: '提交报名', onSubmit() {} }), /¥0\.00/)
})

test('long requirements are initially collapsed while the form retains their contents for expansion', () => {
  const html = render(RequirementDisclosure, { children: '详细材料规范' })
  assert.match(html, /查看要求/)
  assert.doesNotMatch(html, /详细材料规范/)
})

test('PDF-only and image-only materials never offer incompatible file sources', () => {
  assert.deepEqual(materialSources(['.pdf']), ['file'])
  assert.deepEqual(materialSources(['.JPG', '.jpeg']), ['image'])
  assert.deepEqual(materialSources(['.pdf', '.jpg']), ['file', 'image'])
  assert.deepEqual(materialSources([]), [])
})

test('work-unit suggestion uses only an unambiguous current unit, never the first historical record', () => {
  const work = (unit, end) => ({ work_unit: unit, end_date: end })
  assert.equal(currentWorkUnit([work('过去单位', '2020-01-01'), work('当前单位', null)]), '当前单位')
  assert.equal(currentWorkUnit([work('甲单位', null), work('乙单位', null)]), null)
  assert.equal(currentWorkUnit([work('同一单位', null), work(' 同一单位 ', null)]), '同一单位')
  assert.equal(currentWorkUnit([work('过去单位', '2020-01-01')]), null)
})
