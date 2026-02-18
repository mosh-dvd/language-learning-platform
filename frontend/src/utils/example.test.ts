import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { add, normalizeText } from './example'

describe('Example utilities', () => {
  describe('add function', () => {
    it('adds two numbers correctly', () => {
      expect(add(2, 3)).toBe(5)
      expect(add(-1, 1)).toBe(0)
    })

    // Property-based test example
    it('addition is commutative', () => {
      fc.assert(
        fc.property(fc.integer(), fc.integer(), (a, b) => {
          return add(a, b) === add(b, a)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('normalizeText function', () => {
    it('normalizes text correctly', () => {
      expect(normalizeText('  Hello World  ')).toBe('hello world')
      expect(normalizeText('TEST')).toBe('test')
    })

    // Property-based test example
    it('normalized text is always lowercase', () => {
      fc.assert(
        fc.property(fc.string(), (text) => {
          const normalized = normalizeText(text)
          return normalized === normalized.toLowerCase()
        }),
        { numRuns: 100 }
      )
    })
  })
})
