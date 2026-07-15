import type { ProviderResult } from './types'

/**
 * Google exposes no per-key REST endpoint for Gemini API spend; costs live in
 * Cloud Billing, which requires a BigQuery export to query programmatically.
 * Reported as unavailable rather than scraped or faked.
 */
export async function fetchGoogleCosts(): Promise<ProviderResult> {
  return {
    status: 'unavailable',
    message: 'Requires a Cloud Billing BigQuery export — not supported yet',
    dailyCosts: [],
  }
}
