import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { generateId, isValidEmail } from './example'

describe('Example utilities', () => {
  describe('generateId', () => {
    it('generates a non-empty string', () => {
      const id = generateId()
      expect(id).toBeTruthy()
      expect(typeof id).toBe('string')
    })

    // Property-based test: generated IDs should be unique
    it('generates unique IDs', () => {
      const ids = new Set<string>()
      for (let i = 0; i < 100; i++) {
        ids.add(generateId())
      }
      expect(ids.size).toBe(100)
    })
  })

  describe('isValidEmail', () => {
    it('validates correct email formats', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true)
    })

    it('rejects invalid email formats', () => {
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('test@')).toBe(false)
    })

    // Property-based test: valid emails must contain @ and .
    it('valid emails contain @ and .', () => {
      fc.assert(
        fc.property(
          fc.emailAddress(),
          (email) => {
            if (isValidEmail(email)) {
              return email.includes('@') && email.includes('.')
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
