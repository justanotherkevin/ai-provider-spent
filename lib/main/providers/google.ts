import type { UnavailableProvider } from './types'

/**
 * Google exposes no per-key REST endpoint for Gemini API spend; costs live in
 * Cloud Billing, which requires a BigQuery export to query programmatically.
 * Reported as unavailable rather than scraped or faked.
 */
export const google: UnavailableProvider = {
  id: 'google',
  name: 'Google Gemini',
  access: 'unavailable',
  message: 'Requires a Cloud Billing BigQuery export — not supported yet',
}
