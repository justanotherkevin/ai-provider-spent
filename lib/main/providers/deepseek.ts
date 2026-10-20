import { z } from 'zod'
import { utcDayStart, type ApiKeyProvider, type ProviderResult, type DailyCost } from './types'

const bucketSchema = z.object({ time: z.coerce.number(), cost: z.unknown() })
const seriesSchema = z.object({ buckets: z.array(bucketSchema).catch([]) })

const responseSchema = z.object({
  code: z.coerce.number(),
  data: z
    .object({
      biz_code: z.coerce.number(),
      biz_data: z
        .object({
          data: z.array(
            z.object({
              currency: z.string(),
              series: z.array(seriesSchema).catch([]),
              function_series: z.array(seriesSchema).optional().catch([]),
            })
          ),
        })
        .nullish(),
    })
    .nullish(),
})

const fail = (message: string): ProviderResult => ({ status: 'error', message, dailyCosts: [] })

/** Accepts the raw token, a quoted string, or the whole localStorage.userToken JSON, and returns the bare token. */
export const normalizeToken = (input: string): string => {
  const text = input.trim()
  try {
    if (text.startsWith('{')) {
      const value = (JSON.parse(text) as { value?: unknown }).value
      if (typeof value === 'string') return value.trim()
    } else if (text.startsWith('"')) {
      const value: unknown = JSON.parse(text)
      if (typeof value === 'string') return value.trim()
    }
  } catch {
    // fall through to the trimmed input
  }
  return text
}

/** Turns a dashboard cost response into daily USD spend. Never throws. */
export const parseDeepSeekCosts = (body: unknown): ProviderResult => {
  const parsed = responseSchema.safeParse(body)
  if (!parsed.success) return fail('Unexpected DeepSeek dashboard response')
  const { code, data } = parsed.data

  if (code === 40003) return fail('DeepSeek token expired, paste a new one in Settings')
  const errorCode = code !== 0 ? code : (data?.biz_code ?? 0)
  if (errorCode !== 0) return fail(`DeepSeek dashboard error code ${errorCode}`)

  const entries = data?.biz_data?.data
  if (!entries) return fail('Unexpected DeepSeek dashboard response')

  const usd = entries.filter((e) => e.currency === 'USD')
  if (entries.length > 0 && usd.length === 0) return fail('Only USD billing is supported')

  const byDate = new Map<string, number>()
  for (const entry of usd) {
    for (const series of [...entry.series, ...(entry.function_series ?? [])]) {
      for (const bucket of series.buckets) {
        const cost = typeof bucket.cost === 'string' || typeof bucket.cost === 'number' ? Number(bucket.cost) : NaN
        if (!Number.isFinite(cost) || !Number.isFinite(bucket.time)) continue
        const date = new Date(bucket.time * 1000).toISOString().slice(0, 10)
        byDate.set(date, (byDate.get(date) ?? 0) + cost)
      }
    }
  }

  const dailyCosts: DailyCost[] = [...byDate]
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date))
  return { status: 'ok', dailyCosts }
}

/**
 * DeepSeek dashboard cost endpoint, daily buckets for the last 31 days.
 * Undocumented internal API behind platform.deepseek.com/usage, authenticated with the dashboard token.
 */
async function fetchDeepSeekCosts(token: string): Promise<ProviderResult> {
  const start = Math.floor(utcDayStart(30).getTime() / 1000)
  const end = Math.floor(utcDayStart(-1).getTime() / 1000)
  const url = `https://platform.deepseek.com/api/v0/usage/by_api_key/cost?start=${start}&end=${end}&tz=0`

  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${normalizeToken(token)}` } })
    if (!res.ok) return fail(`DeepSeek dashboard error ${res.status}`)
    return parseDeepSeekCosts(await res.json())
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Network error')
  }
}

export const deepseek: ApiKeyProvider = {
  id: 'deepseek',
  name: 'DeepSeek',
  access: 'api-key',
  keyLabel: 'Dashboard token',
  keyHelp:
    'Sign in at platform.deepseek.com in your browser, open the DevTools console, run copy(JSON.parse(localStorage.userToken).value), and paste the result here.',
  fetchSpend: fetchDeepSeekCosts,
}
