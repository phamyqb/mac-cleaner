import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { parseVmStat, parsePressure } from '../../src/ram/stats.js'

const VM_STAT_FIXTURE = `Mach Virtual Memory Statistics: (page size of 16384 bytes)
Pages free:                               5000.
Pages active:                            20000.
Pages inactive:                          10000.
Pages wired down:                         8000.
Pages occupied by compressor:             2000.
`

test('parseVmStat: extracts page size', () => {
  const { pageSize } = parseVmStat(VM_STAT_FIXTURE)
  assert.equal(pageSize, 16384)
})

test('parseVmStat: extracts free pages', () => {
  const { freePages } = parseVmStat(VM_STAT_FIXTURE)
  assert.equal(freePages, 5000)
})

test('parseVmStat: extracts wired pages', () => {
  const { wiredPages } = parseVmStat(VM_STAT_FIXTURE)
  assert.equal(wiredPages, 8000)
})

test('parseVmStat: extracts compressed pages', () => {
  const { compressedPages } = parseVmStat(VM_STAT_FIXTURE)
  assert.equal(compressedPages, 2000)
})

test('parseVmStat: missing field returns 0', () => {
  const { freePages } = parseVmStat('Mach Virtual Memory Statistics: (page size of 16384 bytes)\n')
  assert.equal(freePages, 0)
})

test('parsePressure: returns normal', () => {
  assert.equal(parsePressure('System memory pressure: normal'), 'normal')
})

test('parsePressure: returns warn', () => {
  assert.equal(parsePressure('System memory pressure: warn'), 'warn')
})

test('parsePressure: returns critical', () => {
  assert.equal(parsePressure('System memory pressure: critical'), 'critical')
})

test('parsePressure: defaults to normal for empty string', () => {
  assert.equal(parsePressure(''), 'normal')
})
