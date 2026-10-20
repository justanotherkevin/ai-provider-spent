import { getKey, hasKey } from '../keystore'
import type { ProviderId } from '@/lib/conveyor/schemas/spend-schema'
import { anthropic } from './anthropic'
import { openai } from './openai'
import { google } from './google'
import type { Provider, ProviderResult } from './types'

export const PROVIDERS: Provider[] = [anthropic, openai, google]

/** Spend for one provider, following its declared access path. */
export const fetchProviderSpend = (provider: Provider): Promise<ProviderResult> => {
  if (provider.access === 'unavailable') {
    return Promise.resolve({ status: 'unavailable', message: provider.message, dailyCosts: [] })
  }
  const key = getKey(provider.id)
  if (!key) return Promise.resolve({ status: 'no-key', dailyCosts: [] })
  return provider.fetchSpend(key)
}

/** Whether a key is stored, for each provider that uses one. */
export const getKeyStatus = (): Partial<Record<ProviderId, boolean>> =>
  Object.fromEntries(PROVIDERS.filter((p) => p.access === 'api-key').map((p) => [p.id, hasKey(p.id)]))
