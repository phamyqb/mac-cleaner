// test/scanner.test.js
import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { formatBytes } from '../src/scanner.js'
import { categories } from '../src/categories.js'

test('formatBytes: 0 bytes', () => {
  assert.equal(formatBytes(0), '0 B')
})

test('formatBytes: kilobytes', () => {
  assert.equal(formatBytes(1024), '1.0 KB')
})

test('formatBytes: megabytes', () => {
  assert.equal(formatBytes(1024 * 1024), '1.0 MB')
})

test('formatBytes: gigabytes', () => {
  assert.equal(formatBytes(1024 * 1024 * 1024), '1.0 GB')
})

test('formatBytes: fractional MB', () => {
  assert.equal(formatBytes(1.5 * 1024 * 1024), '1.5 MB')
})

test('categories: all have required fields', () => {
  for (const cat of categories) {
    assert.ok(typeof cat.id === 'string' && cat.id.length > 0, `${cat.id} missing id`)
    assert.ok(typeof cat.label === 'string', `${cat.id} missing label`)
    assert.ok(
      cat.safetyLevel === 'safe' || cat.safetyLevel === 'situational',
      `${cat.id} invalid safetyLevel: ${cat.safetyLevel}`
    )
    assert.ok(Array.isArray(cat.paths) && cat.paths.length > 0, `${cat.id} must have paths array`)
    assert.ok(typeof cat.description === 'string', `${cat.id} missing description`)
  }
})

test('categories: ids are unique', () => {
  const ids = categories.map(c => c.id)
  const unique = new Set(ids)
  assert.equal(unique.size, ids.length, 'duplicate category ids found')
})

import { cleaners } from '../src/cleaners.js'

test('cleaners: every category has a cleaner', () => {
  for (const cat of categories) {
    assert.ok(
      typeof cleaners[cat.id] === 'function',
      `missing cleaner for category: ${cat.id}`
    )
  }
})

test('cleaners: no extra cleaners without a category', () => {
  const ids = new Set(categories.map(c => c.id))
  for (const key of Object.keys(cleaners)) {
    assert.ok(ids.has(key), `cleaner "${key}" has no matching category`)
  }
})
