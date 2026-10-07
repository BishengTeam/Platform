import assert from 'node:assert/strict'
import test from 'node:test'

import { getNispLevelFromCertCode } from '../src/services/nispService.ts'

test('NISP product codes map to the dedicated level entry', () => {
  assert.equal(getNispLevelFromCertCode('NISP-1'), '1')
  assert.equal(getNispLevelFromCertCode('NISP-2'), '2')
  assert.equal(getNispLevelFromCertCode(' nisp-2 '), '2')
  assert.equal(getNispLevelFromCertCode('NISP'), '1')
})
