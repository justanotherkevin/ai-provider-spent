import { useCallback, useEffect, useState } from 'react'
import { Power, RefreshCw, Settings } from 'lucide-react'
import { useConveyor } from '@/app/hooks/use-conveyor'
import type { SpendSnapshot, ProviderSpend } from '@/lib/conveyor/schemas/spend-schema'
import { PROVIDERS } from './providers'
import { ClaudeUsageCard } from './ClaudeUsageCard'

type Period = 'today' | '7d' | 'month'

const PERIODS: { id: Period; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 Days' },
  { id: 'month', label: 'Month' },
]

const utcDate = (daysBack: number) => {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysBack))
    .toISOString()
    .slice(0, 10)
}

const periodStart = (period: Period): string => {
  if (period === 'today') return utcDate(0)
  if (period === '7d') return utcDate(6)
  return utcDate(0).slice(0, 8) + '01'
}

const periodTotal = (spend: ProviderSpend, period: Period): number => {
  const start = periodStart(period)
  return spend.dailyCosts.filter((d) => d.date >= start).reduce((sum, d) => sum + d.amount, 0)
}

const formatUsd = (amount: number) => `$${amount.toFixed(2)}`

const formatUpdatedAt = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

const ProviderRow = ({ spend, period }: { spend: ProviderSpend; period: Period }) => {
  const meta = PROVIDERS.find((p) => p.id === spend.provider)

  return (
    <div className="provider-row">
      <span className="provider-name">{meta?.name ?? spend.provider}</span>
      {spend.status === 'ok' ? (
        <span className="provider-amount">{formatUsd(periodTotal(spend, period))}</span>
      ) : (
        <span className={`provider-note${spend.status === 'error' ? ' provider-note-error' : ''}`}>
          {spend.status === 'no-key' ? 'No API key' : (spend.message ?? 'Unavailable')}
        </span>
      )}
    </div>
  )
}

export const SpendView = ({ onOpenSettings }: { onOpenSettings: () => void }) => {
  const spendApi = useConveyor('spend')
  const appApi = useConveyor('app')
  const [snapshot, setSnapshot] = useState<SpendSnapshot | null>(null)
  const [period, setPeriod] = useState<Period>('month')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    spendApi.snapshot().then(setSnapshot)
    const id = setInterval(() => spendApi.snapshot().then(setSnapshot), 60_000)
    return () => clearInterval(id)
  }, [spendApi])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      setSnapshot(await spendApi.refresh())
    } finally {
      setRefreshing(false)
    }
  }, [spendApi])

  const okProviders = snapshot?.providers.filter((p) => p.status === 'ok') ?? []
  const total = okProviders.reduce((sum, p) => sum + periodTotal(p, period), 0)

  return (
    <div className="popover">
      <header className="popover-header">
        <span className="popover-title">AI Spend</span>
        <button className="icon-button" onClick={onOpenSettings} title="Settings">
          <Settings size={14} />
        </button>
      </header>

      <div className="segmented-control">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            className={`segment${period === p.id ? ' segment-active' : ''}`}
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="total-block">
        <span className="total-amount">{okProviders.length > 0 ? formatUsd(total) : '—'}</span>
        <span className="total-caption">{PERIODS.find((p) => p.id === period)?.label} · all providers</span>
      </div>

      <div className="popover-scroll">
        <div className="provider-list">
          {snapshot ? (
            snapshot.providers.map((p) => <ProviderRow key={p.provider} spend={p} period={period} />)
          ) : (
            <div className="provider-note loading-note">Loading…</div>
          )}
        </div>

        <ClaudeUsageCard />
      </div>

      <footer className="popover-footer">
        <span className="footer-status">
          {snapshot?.updatedAt ? `Updated ${formatUpdatedAt(snapshot.updatedAt)}` : ''}
        </span>
        <div className="footer-actions">
          <button className="icon-button" onClick={refresh} disabled={refreshing} title="Refresh">
            <RefreshCw size={13} className={refreshing ? 'spinning' : undefined} />
          </button>
          <button className="icon-button" onClick={() => appApi.quit()} title="Quit">
            <Power size={13} />
          </button>
        </div>
      </footer>
    </div>
  )
}
