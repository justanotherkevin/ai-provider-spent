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
