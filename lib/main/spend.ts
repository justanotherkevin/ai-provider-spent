import { getKey, type ProviderId } from './keystore'
import { fetchAnthropicCosts } from './providers/anthropic'
import { fetchOpenAICosts } from './providers/openai'
import { fetchGoogleCosts } from './providers/google'
import type { ProviderResult } from './providers/types'

export interface ProviderSpend extends ProviderResult {
  provider: ProviderId
}

export interface SpendSnapshot {
  providers: ProviderSpend[]
  updatedAt: number | null
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000

let snapshot: SpendSnapshot = { providers: [], updatedAt: null }
let onUpdate: ((snapshot: SpendSnapshot) => void) | null = null

export const getSnapshot = (): SpendSnapshot => snapshot

/** Combined month-to-date total (UTC calendar month) across providers with data. */
export const monthToDateTotal = (snap: SpendSnapshot): number | null => {
  const monthStart = new Date().toISOString().slice(0, 8) + '01'
  const okProviders = snap.providers.filter((p) => p.status === 'ok')
  if (okProviders.length === 0) return null
  return okProviders.reduce(
    (total, p) => total + p.dailyCosts.filter((d) => d.date >= monthStart).reduce((s, d) => s + d.amount, 0),
    0
  )
}

export async function refreshSpend(): Promise<SpendSnapshot> {
  const withKey = (provider: ProviderId, fetcher: (key: string) => Promise<ProviderResult>): Promise<ProviderResult> => {
    const key = getKey(provider)
    if (!key) return Promise.resolve({ status: 'no-key', dailyCosts: [] })
    return fetcher(key)
  }

  const [anthropic, openai, google] = await Promise.all([
    withKey('anthropic', fetchAnthropicCosts),
    withKey('openai', fetchOpenAICosts),
    fetchGoogleCosts(),
  ])

  snapshot = {
    providers: [
      { provider: 'anthropic', ...anthropic },
      { provider: 'openai', ...openai },
      { provider: 'google', ...google },
    ],
    updatedAt: Date.now(),
  }
  onUpdate?.(snapshot)
  return snapshot
}

export function startSpendScheduler(handleUpdate: (snapshot: SpendSnapshot) => void): void {
  onUpdate = handleUpdate
  void refreshSpend()
  setInterval(() => void refreshSpend(), REFRESH_INTERVAL_MS)
}
