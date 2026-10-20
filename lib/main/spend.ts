import type { ProviderId } from '@/lib/conveyor/schemas/spend-schema'
import { PROVIDERS, fetchProviderSpend } from './providers'
import type { Provider, ProviderResult } from './providers/types'

export interface ProviderSpend extends ProviderResult {
  provider: ProviderId
  name: string
  access: Provider['access']
  keyLabel?: string // set only for api-key providers
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
  const providers = await Promise.all(
    PROVIDERS.map(
      async (p): Promise<ProviderSpend> => ({
        provider: p.id,
        name: p.name,
        access: p.access,
        ...(p.access === 'api-key' && { keyLabel: p.keyLabel }),
        ...(await fetchProviderSpend(p)),
      })
    )
  )

  snapshot = { providers, updatedAt: Date.now() }
  onUpdate?.(snapshot)
  return snapshot
}

export function startSpendScheduler(handleUpdate: (snapshot: SpendSnapshot) => void): void {
  onUpdate = handleUpdate
  void refreshSpend()
  setInterval(() => void refreshSpend(), REFRESH_INTERVAL_MS)
}
