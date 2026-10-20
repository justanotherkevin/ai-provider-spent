import { utcDayStart, type ApiKeyProvider, type ProviderResult, type DailyCost } from './types'

interface CostBucket {
  start_time: number
  results: { amount: { value: number; currency: string } }[]
}

interface CostsPage {
  data: CostBucket[]
  has_more: boolean
  next_page: string | null
}

/**
 * OpenAI organization Costs API, daily buckets for the last 31 days.
 * https://developers.openai.com/api/reference — requires an Admin API key.
 */
async function fetchOpenAICosts(adminKey: string): Promise<ProviderResult> {
  const startTime = Math.floor(utcDayStart(30).getTime() / 1000)
  const base = `https://api.openai.com/v1/organization/costs?start_time=${startTime}&bucket_width=1d&limit=31`

  const dailyCosts: DailyCost[] = []
  let page: string | null = null

  try {
    do {
      const url = page ? `${base}&page=${encodeURIComponent(page)}` : base
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${adminKey}` },
      })
      if (res.status === 401 || res.status === 403) {
        return { status: 'error', message: 'Invalid or non-admin API key', dailyCosts: [] }
      }
      if (!res.ok) {
        return { status: 'error', message: `OpenAI API error ${res.status}`, dailyCosts: [] }
      }
      const body = (await res.json()) as CostsPage
      for (const bucket of body.data) {
        const amount = bucket.results.reduce((sum, r) => sum + r.amount.value, 0)
        dailyCosts.push({ date: new Date(bucket.start_time * 1000).toISOString().slice(0, 10), amount })
      }
      page = body.has_more ? body.next_page : null
    } while (page)
    return { status: 'ok', dailyCosts }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Network error', dailyCosts: [] }
  }
}

export const openai: ApiKeyProvider = {
  id: 'openai',
  name: 'OpenAI',
  access: 'api-key',
  keyLabel: 'Admin API key',
  fetchSpend: fetchOpenAICosts,
}
