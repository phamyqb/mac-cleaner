import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { parsePs } from '../../src/ram/processes.js'

// Format: pid rss command (no header, -c flag gives clean names)
const PS_FIXTURE = `12345 831976 Google Chrome Helper
 5678 649288 Slack
 9012 593408 Xcode
    0 1024000 kernel_task
  100 512 tiny
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
    `${i + 1} ${(i + 1) * 1000} proc${i + 1}`
  ).join('\n')
  const results = parsePs(many)
  assert.ok(results.length <= 8)
})

test('parsePs: filters entries with zero rss', () => {
  const fixture = '123 0 foo\n'
  const results = parsePs(fixture)
  assert.equal(results.length, 0)
})
