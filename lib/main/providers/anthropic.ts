import { utcDayStart, type ApiKeyProvider, type ProviderResult, type DailyCost } from './types'

interface CostBucket {
  starting_at: string
  results: { amount: string; currency: string }[]
}

interface CostReportPage {
  data: CostBucket[]
  has_more: boolean
  next_page: string | null
}

/**
 * Anthropic Admin API cost report, daily buckets for the last 31 days.
 * https://platform.claude.com/docs/en/manage-claude/usage-cost-api
 */
async function fetchAnthropicCosts(adminKey: string): Promise<ProviderResult> {
  const startingAt = utcDayStart(30).toISOString()
  const base = `https://api.anthropic.com/v1/organizations/cost_report?starting_at=${encodeURIComponent(startingAt)}&bucket_width=1d&limit=31`

  const dailyCosts: DailyCost[] = []
  let page: string | null = null

  try {
    do {
      const url = page ? `${base}&page=${encodeURIComponent(page)}` : base
      const res = await fetch(url, {
        headers: {
          'x-api-key': adminKey,
          'anthropic-version': '2023-06-01',
        },
      })
      if (res.status === 401 || res.status === 403) {
        return { status: 'error', message: 'Invalid or unauthorized Admin API key', dailyCosts: [] }
      }
      if (!res.ok) {
        return { status: 'error', message: `Anthropic API error ${res.status}`, dailyCosts: [] }
      }
      const body = (await res.json()) as CostReportPage
      for (const bucket of body.data) {
        const amount = bucket.results.reduce((sum, r) => sum + parseFloat(r.amount), 0)
        dailyCosts.push({ date: bucket.starting_at.slice(0, 10), amount })
      }
      page = body.has_more ? body.next_page : null
    } while (page)
    return { status: 'ok', dailyCosts }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Network error', dailyCosts: [] }
  }
}

export const anthropic: ApiKeyProvider = {
  id: 'anthropic',
  name: 'Anthropic',
  access: 'api-key',
  keyLabel: 'Admin API key',
  fetchSpend: fetchAnthropicCosts,
}
