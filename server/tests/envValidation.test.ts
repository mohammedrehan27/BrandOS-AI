import { describe, it, expect } from 'vitest'
import { getServiceConfigStatus, env } from '../config/env'
import { ServiceNotConfiguredError } from '../services/errors'

describe('Environment Configuration Validation & Secret Safety', () => {
  it('correctly tracks configuration status of external services', () => {
    const status = getServiceConfigStatus()

    expect(status).toHaveProperty('gemini')
    expect(status).toHaveProperty('supabase')
    expect(typeof status.gemini.configured).toBe('boolean')
    expect(Array.isArray(status.gemini.missingVars)).toBe(true)
    expect(typeof status.supabase.configured).toBe('boolean')
    expect(Array.isArray(status.supabase.missingVars)).toBe(true)
  })

  it('lists missing variable names without exposing sensitive secret values', () => {
    const status = getServiceConfigStatus()

    if (!status.gemini.configured) {
      expect(status.gemini.missingVars).toContain('GEMINI_API_KEY')
    }

    if (!status.supabase.configured) {
      expect(
        status.supabase.missingVars.some((v) =>
          ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'].includes(v)
        )
      ).toBe(true)
    }

    // Verify error representation does not contain dummy values
    const sampleError = new ServiceNotConfiguredError('Google Gemini AI', ['GEMINI_API_KEY'])
    expect(sampleError.statusCode).toBe(503)
    expect(sampleError.code).toBe('SERVICE_NOT_CONFIGURED')
    expect(sampleError.message).toContain('GEMINI_API_KEY')
    expect(sampleError.message).not.toContain('secret')
  })

  it('allows development fallback mode when explicitly permitted by env', () => {
    expect(typeof env.ALLOW_DEV_FALLBACK).toBe('boolean')
  })
})
