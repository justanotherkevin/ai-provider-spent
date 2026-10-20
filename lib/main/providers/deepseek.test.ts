import { describe, it, expect } from 'vitest'
import { normalizeToken, parseDeepSeekCosts } from './deepseek'

const day = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 1000)

const apiKey = { tracking_id: 't', name: 'n', sensitive_id: 's', valid: true, key_type: 'k' }

const series = (buckets: unknown[]) => ({ api_key: apiKey, model: 'deepseek-v4-flash', buckets })

const response = (entries: unknown[], bizCode = 0) => ({
  code: 0,
  msg: '',
  data: {
    biz_code: bizCode,
    biz_msg: '',
    biz_data: {
      start: day('2026-10-01'),
      end: day('2026-10-31'),
      bucket: 86400,
      models: ['deepseek-v4-flash'],
      functions: [],
      data: entries,
    },
  },
})

describe('parseDeepSeekCosts', () => {
  it('sums series and function_series per UTC day, sorted ascending', () => {
    const body = response([
      {
        currency: 'USD',
        series: [
          series([
            { time: day('2026-10-03'), cost: '0.5' },
            { time: day('2026-10-02'), cost: '0.012' },
          ]),
          series([{ time: day('2026-10-02'), cost: '0.1' }]),
        ],
        function_series: [series([{ time: day('2026-10-03'), cost: '0.25' }])],
      },
    ])
    const result = parseDeepSeekCosts(body)
    expect(result.status).toBe('ok')
    expect(result.dailyCosts.map((d) => d.date)).toEqual(['2026-10-02', '2026-10-03'])
    expect(result.dailyCosts[0].amount).toBeCloseTo(0.112)
    expect(result.dailyCosts[1].amount).toBeCloseTo(0.75)
  })

  it('reports an expired token', () => {
    const result = parseDeepSeekCosts({ code: 40003, msg: 'x', data: null })
    expect(result).toEqual({
      status: 'error',
      message: 'DeepSeek token expired, paste a new one in Settings',
      dailyCosts: [],
    })
  })

  it('reports a non-zero top-level code other than 40003', () => {
    const result = parseDeepSeekCosts({ code: 7, msg: 'x', data: null })
    expect(result.status).toBe('error')
    expect(result.message).toBe('DeepSeek dashboard error code 7')
  })

  it('accepts an empty data array', () => {
    expect(parseDeepSeekCosts(response([]))).toEqual({ status: 'ok', dailyCosts: [] })
  })

  it('reports a non-zero biz_code', () => {
    const result = parseDeepSeekCosts(response([], 5))
    expect(result.status).toBe('error')
    expect(result.message).toBe('DeepSeek dashboard error code 5')
  })

  it('rejects non-USD billing', () => {
    const result = parseDeepSeekCosts(
      response([{ currency: 'CNY', series: [series([{ time: day('2026-10-02'), cost: '1' }])], function_series: [] }])
    )
    expect(result.status).toBe('error')
    expect(result.message).toBe('Only USD billing is supported')
  })

  it('rejects unexpected shapes', () => {
    for (const body of [{ foo: 1 }, null]) {
      const result = parseDeepSeekCosts(body)
      expect(result.status).toBe('error')
      expect(result.message).toBe('Unexpected DeepSeek dashboard response')
    }
  })

  it('skips buckets with unusable cost', () => {
    const result = parseDeepSeekCosts(
      response([
        {
          currency: 'USD',
          series: [
            series([
              { time: day('2026-10-02'), cost: 'bad' },
              { time: day('2026-10-02'), cost: null },
              { time: day('2026-10-02'), cost: '0.2' },
              { time: day('2026-10-03'), cost: '0.3' },
            ]),
          ],
          function_series: [],
        },
      ])
    )
    expect(result.status).toBe('ok')
    expect(result.dailyCosts).toHaveLength(2)
    expect(result.dailyCosts[0].amount).toBeCloseTo(0.2)
    expect(result.dailyCosts[1].amount).toBeCloseTo(0.3)
  })

  it('accepts a missing function_series', () => {
    const result = parseDeepSeekCosts(
      response([{ currency: 'USD', series: [series([{ time: day('2026-10-02'), cost: '0.4' }])] }])
    )
    expect(result.status).toBe('ok')
    expect(result.dailyCosts).toHaveLength(1)
    expect(result.dailyCosts[0].amount).toBeCloseTo(0.4)
  })
})

describe('normalizeToken', () => {
  it.each(['  abc\n', '{"value":"abc","__version":"0"}', '"abc"', 'abc'])('unwraps %j', (input) => {
    expect(normalizeToken(input)).toBe('abc')
  })

  it('returns invalid JSON unchanged', () => {
    expect(normalizeToken('{not json')).toBe('{not json')
  })
})
