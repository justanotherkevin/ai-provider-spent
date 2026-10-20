import { describe, it, expect } from 'vitest'
import { parseUsageResponse } from './claude-code-usage'
import { claudeUsageSnapshotSchema } from '@/lib/conveyor/schemas/claude-usage-schema'

const limits = () => [
  { kind: 'session', group: 'g', percent: 27, resets_at: '2026-10-20T19:00:00Z', is_active: true, scope: null },
  { kind: 'weekly_all', group: 'g', percent: 40, resets_at: '2026-10-25T19:00:00Z', is_active: true, scope: null },
  {
    kind: 'weekly_model',
    group: 'g',
    percent: 10,
    resets_at: null,
    is_active: false,
    scope: { model: { display_name: 'Opus' } },
  },
]

const fitsIpcSchema = (result: ReturnType<typeof parseUsageResponse>) =>
  claudeUsageSnapshotSchema.parse({ status: 'ok', ...result, updatedAt: 1 })

const extra = { is_enabled: true, monthly_limit: 5000, used_credits: 12.5, utilization: 25 }

describe('parseUsageResponse', () => {
  it('parses a full valid body', () => {
    const result = parseUsageResponse({ limits: limits(), extra_usage: extra })
    expect(result?.limits.map((l) => l.label)).toEqual(['Current session', 'All models', 'Opus'])
    expect(result?.limits[0]).toEqual({
      kind: 'session',
      label: 'Current session',
      percent: 27,
      resetsAt: '2026-10-20T19:00:00Z',
      isActive: true,
    })
    expect(result?.credits).toEqual({ enabled: true, usedDollars: 12.5, limitDollars: 50, percent: 25 })
    expect(() => fitsIpcSchema(result)).not.toThrow()
  })

  it('returns no credits when extra usage is disabled with null numbers', () => {
    const result = parseUsageResponse({
      limits: limits(),
      extra_usage: { is_enabled: false, monthly_limit: 0, used_credits: null, utilization: null },
    })
    expect(result?.credits).toBeNull()
    expect(result?.limits).toHaveLength(3)
  })

  it('uses zeros when enabled with null numbers', () => {
    const result = parseUsageResponse({
      limits: limits(),
      extra_usage: { is_enabled: true, monthly_limit: null, used_credits: null, utilization: null },
    })
    expect(result?.credits).toEqual({ enabled: true, usedDollars: 0, limitDollars: 0, percent: 0 })
  })

  it('drops an entry with a non-string kind', () => {
    const result = parseUsageResponse({
      limits: [limits()[0], { ...limits()[0], kind: 5 }, limits()[1]],
      extra_usage: extra,
    })
    expect(result?.limits.map((l) => l.kind)).toEqual(['session', 'weekly_all'])
    expect(() => fitsIpcSchema(result)).not.toThrow()
  })

  it('drops an entry with a non-numeric percent', () => {
    const result = parseUsageResponse({ limits: [limits()[0], { ...limits()[0], percent: 'abc' }, limits()[1]] })
    expect(result?.limits.map((l) => l.kind)).toEqual(['session', 'weekly_all'])
    expect(() => fitsIpcSchema(result)).not.toThrow()
  })

  it('drops an entry with a null percent', () => {
    const result = parseUsageResponse({ limits: [{ ...limits()[0], percent: null }, limits()[1]] })
    expect(result?.limits.map((l) => l.kind)).toEqual(['weekly_all'])
  })

  it('keeps a weekly model entry with a non-string display_name as Weekly', () => {
    const entry = { ...limits()[2], scope: { model: { display_name: 42 } } }
    const result = parseUsageResponse({ limits: [entry] })
    expect(result?.limits.map((l) => l.label)).toEqual(['Weekly'])
  })

  it('keeps an entry with a wrong-typed resets_at as null', () => {
    const result = parseUsageResponse({ limits: [{ ...limits()[0], resets_at: 123 }] })
    expect(result?.limits).toHaveLength(1)
    expect(result?.limits[0].resetsAt).toBeNull()
  })

  it('keeps an entry with a wrong-typed is_active as false', () => {
    const result = parseUsageResponse({ limits: [{ ...limits()[0], is_active: 'yes' }] })
    expect(result?.limits).toHaveLength(1)
    expect(result?.limits[0].isActive).toBe(false)
  })

  it('returns no credits when used_credits is a string', () => {
    const result = parseUsageResponse({ limits: limits(), extra_usage: { ...extra, used_credits: '12' } })
    expect(result?.credits).toBeNull()
  })

  it('drops malformed extra_usage but keeps limits', () => {
    const result = parseUsageResponse({ limits: limits(), extra_usage: 'weird' })
    expect(result?.credits).toBeNull()
    expect(result?.limits).toHaveLength(3)
  })

  it('returns empty limits when limits is missing or not an array', () => {
    expect(parseUsageResponse({ extra_usage: extra })?.limits).toEqual([])
    expect(parseUsageResponse({ limits: 'nope', extra_usage: extra })?.limits).toEqual([])
  })

  it('returns null when the body is not an object', () => {
    expect(parseUsageResponse(null)).toBeNull()
    expect(parseUsageResponse('text')).toBeNull()
    expect(parseUsageResponse([])).toBeNull()
  })

  it('ignores unknown fields', () => {
    const result = parseUsageResponse({
      surprise: 1,
      limits: [{ ...limits()[0], extra: true }],
      extra_usage: { ...extra, more: 'x' },
    })
    expect(result?.limits).toHaveLength(1)
    expect(result?.credits?.usedDollars).toBe(12.5)
  })
})
