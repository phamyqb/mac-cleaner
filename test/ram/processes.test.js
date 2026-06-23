import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { parsePs } from '../../src/ram/processes.js'

const PS_FIXTURE = `  PID COMM                   RSS
12345 Google Chrome Helper  831976
 5678 Slack                 649288
 9012 Xcode                 593408
    0 kernel_task          1024000
  100 tiny                     512
`

test('parsePs: filters out kernel_task (pid 0)', () => {
  const results = parsePs(PS_FIXTURE)
  assert.ok(!results.some(p => p.pid === 0))
})

test('parsePs: converts rss kilobytes to MB', () => {
  const results = parsePs(PS_FIXTURE)
  const chrome = results.find(p => p.pid === 12345)
  assert.equal(chrome.memMB, Math.round(831976 / 1024))
})

test('parsePs: includes process name', () => {
  const results = parsePs(PS_FIXTURE)
  const slack = results.find(p => p.pid === 5678)
  assert.ok(slack)
  assert.equal(slack.name, 'Slack')
})

test('parsePs: captures multi-word process names', () => {
  const results = parsePs(PS_FIXTURE)
  const chrome = results.find(p => p.pid === 12345)
  assert.ok(chrome)
  assert.equal(chrome.name, 'Google Chrome Helper')
})

test('parsePs: returns at most 8 results', () => {
  const many = Array.from({ length: 20 }, (_, i) =>
    `${i + 1} proc${i + 1} ${(i + 1) * 1000}`
  ).join('\n')
  const results = parsePs('  PID COMM RSS\n' + many)
  assert.ok(results.length <= 8)
})

test('parsePs: filters entries with zero rss', () => {
  const fixture = '  PID COMM   RSS\n  123 foo      0\n'
  const results = parsePs(fixture)
  assert.equal(results.length, 0)
})
