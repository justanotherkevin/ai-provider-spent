import { useEffect, useState } from 'react'
import { useConveyor } from '@/app/hooks/use-conveyor'
import type { ClaudeUsageSnapshot, ClaudeUsageLimit } from '@/lib/conveyor/schemas/claude-usage-schema'

const formatResetsIn = (resetsAt: string | null): string => {
  if (!resetsAt) return ''
  const ms = new Date(resetsAt).getTime() - Date.now()
  if (ms <= 0) return 'resets soon'
  const totalMinutes = Math.round(ms / 60_000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `resets in ${days}d ${hours}h`
  if (hours > 0) return `resets in ${hours}h ${minutes}m`
  return `resets in ${minutes}m`
}

const LimitRow = ({ limit }: { limit: ClaudeUsageLimit }) => (
  <div className="usage-limit-row">
    <div className="usage-limit-header">
      <span className="usage-limit-label">{limit.label}</span>
      <span className="usage-limit-percent">{Math.round(limit.percent)}%</span>
    </div>
    <div className="usage-bar" role="progressbar" aria-valuenow={Math.round(limit.percent)} aria-valuemin={0} aria-valuemax={100} aria-label={limit.label}>
      <div className="usage-bar-fill" style={{ width: `${Math.min(100, limit.percent)}%` }} />
    </div>
    <span className="usage-card-caption">{formatResetsIn(limit.resetsAt)}</span>
  </div>
)

export const ClaudeUsageCard = () => {
  const claudeUsageApi = useConveyor('claudeUsage')
  const [snapshot, setSnapshot] = useState<ClaudeUsageSnapshot | null>(null)

  useEffect(() => {
    claudeUsageApi.snapshot().then(setSnapshot)
    const id = setInterval(() => claudeUsageApi.snapshot().then(setSnapshot), 60_000)
    return () => clearInterval(id)
  }, [claudeUsageApi])

  if (!snapshot) return null

  if (snapshot.status !== 'ok') {
    return (
      <div className="usage-card">
        <span className="usage-card-title">Claude Code Usage</span>
        <span className="provider-note">
          {snapshot.status === 'no-token' ? 'Log in to Claude Code to see plan usage' : (snapshot.message ?? 'Unavailable')}
        </span>
      </div>
    )
  }

  return (
    <div className="usage-card">
      <span className="usage-card-title">Claude Code Usage</span>
      {snapshot.limits.map((limit) => (
        <LimitRow key={`${limit.kind}-${limit.label}`} limit={limit} />
      ))}
      {snapshot.credits?.enabled && (
        <span className="usage-card-caption">
          ${snapshot.credits.usedDollars.toFixed(2)} / ${snapshot.credits.limitDollars.toFixed(2)} usage credits
        </span>
      )}
    </div>
  )
}
