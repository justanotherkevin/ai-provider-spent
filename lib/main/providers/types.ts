import type { ProviderId } from '@/lib/conveyor/schemas/spend-schema'

export interface DailyCost {
  /** UTC calendar day, YYYY-MM-DD */
  date: string
  /** USD */
  amount: number
}

export type ProviderStatus = 'ok' | 'no-key' | 'unavailable' | 'error'

export interface ProviderResult {
  status: ProviderStatus
  message?: string
  dailyCosts: DailyCost[]
}

/** Start of the UTC day `daysBack` days ago. */
export const utcDayStart = (daysBack: number): Date => {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysBack))
}

interface ProviderBase {
  id: ProviderId
  name: string
}

export interface ApiKeyProvider extends ProviderBase {
  access: 'api-key'
  /** Placeholder for the key input in Settings, e.g. 'Admin API key'. */
  keyLabel: string
  /** Shown under the key input in Settings, e.g. how to find the key. */
  keyHelp?: string
  /** Last 31 days of spend. Never throws. */
  fetchSpend: (apiKey: string) => Promise<ProviderResult>
}

export interface UnavailableProvider extends ProviderBase {
  access: 'unavailable'
  /** Shown in the spend row and in Settings. */
  message: string
}

export type Provider = ApiKeyProvider | UnavailableProvider
