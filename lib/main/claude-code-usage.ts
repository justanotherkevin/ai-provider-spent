import { execFileSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const USAGE_API_URL = 'https://api.anthropic.com/api/oauth/usage'
const FALLBACK_CLAUDE_VERSION = '2.1.204'

let cachedUserAgent: string | undefined

// The usage endpoint is undocumented and expects a Claude Code user agent.
function claudeCodeUserAgent(): string {
  if (cachedUserAgent) return cachedUserAgent
  let version = FALLBACK_CLAUDE_VERSION
  try {
    // Finder-launched apps get a minimal PATH, so add the usual install locations
    const extra = [join(homedir(), '.local/bin'), '/opt/homebrew/bin', '/usr/local/bin']
    const PATH = [...extra, process.env.PATH].filter(Boolean).join(':')
    const out = execFileSync('claude', ['--version'], {
      encoding: 'utf8',
      timeout: 3000,
      stdio: ['ignore', 'pipe', 'ignore'],
      env: { ...process.env, PATH },
    })
    const match = out.match(/^\s*(\d+\.\d+\.\d+)/)
    if (match) version = match[1]
  } catch {
    // keep fallback
  }
  cachedUserAgent = `claude-code/${version}`
  return cachedUserAgent
}

export interface ClaudeUsageLimit {
  kind: string
  label: string
  percent: number
  resetsAt: string | null
  isActive: boolean
}

export interface ClaudeUsageCredits {
  enabled: boolean
  usedDollars: number
  limitDollars: number
  percent: number
}

export interface ClaudeUsageSnapshot {
  status: 'ok' | 'no-token' | 'error'
  message?: string
  limits: ClaudeUsageLimit[]
  credits?: ClaudeUsageCredits | null
  updatedAt: number | null
}

interface OAuthCredentials {
  claudeAiOauth?: { accessToken?: string }
}

/** Claude Code stores its OAuth token in the macOS Keychain, or a plaintext credentials file elsewhere. */
const readAccessToken = (): string | null => {
  if (process.platform === 'darwin') {
    try {
      const raw = execFileSync('security', ['find-generic-password', '-s', 'Claude Code-credentials', '-w'], {
        encoding: 'utf8',
      })
      const creds = JSON.parse(raw) as OAuthCredentials
      return creds.claudeAiOauth?.accessToken ?? null
    } catch {
      return null
    }
  }

  const configDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude')
  const credentialsFile = join(configDir, '.credentials.json')
  if (!existsSync(credentialsFile)) return null
  try {
    const creds = JSON.parse(readFileSync(credentialsFile, 'utf8')) as OAuthCredentials
    return creds.claudeAiOauth?.accessToken ?? null
  } catch {
    return null
  }
}

interface RawLimitEntry {
  kind: string
  group: string
  percent: number
  resets_at: string | null
  is_active: boolean
  scope: { model?: { display_name?: string } } | null
}

interface RawUsageResponse {
  limits?: RawLimitEntry[]
  extra_usage?: {
    is_enabled: boolean
    monthly_limit: number
    used_credits: number
    utilization: number
  }
}

const labelForLimit = (entry: RawLimitEntry): string => {
  if (entry.kind === 'session') return 'Current session'
  if (entry.kind === 'weekly_all') return 'All models'
  return entry.scope?.model?.display_name ?? 'Weekly'
}

const parseUsageResponse = (body: RawUsageResponse): { limits: ClaudeUsageLimit[]; credits: ClaudeUsageCredits | null } => {
  const limits: ClaudeUsageLimit[] = (body.limits ?? []).map((entry) => ({
    kind: entry.kind,
    label: labelForLimit(entry),
    percent: entry.percent,
    resetsAt: entry.resets_at,
    isActive: entry.is_active,
  }))

  const extraUsage = body.extra_usage
  const credits: ClaudeUsageCredits | null = extraUsage
    ? {
        enabled: extraUsage.is_enabled,
        usedDollars: extraUsage.used_credits,
        limitDollars: extraUsage.monthly_limit / 100, // monthly_limit is in cents
        percent: extraUsage.utilization,
      }
    : null

  return { limits, credits }
}

let snapshot: ClaudeUsageSnapshot = { status: 'no-token', limits: [], updatedAt: null }

export const getClaudeUsageSnapshot = (): ClaudeUsageSnapshot => snapshot

export const refreshClaudeUsage = async (): Promise<ClaudeUsageSnapshot> => {
  const token = readAccessToken()
  if (!token) {
    snapshot = {
      status: 'no-token',
      message: 'Claude Code is not logged in on this machine',
      limits: [],
      updatedAt: Date.now(),
    }
    return snapshot
  }

  try {
    const res = await fetch(USAGE_API_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': claudeCodeUserAgent(),
        'anthropic-beta': 'oauth-2025-04-20',
      },
    })

    if (res.status === 401) {
      snapshot = { status: 'no-token', message: 'Claude Code session expired — log in again', limits: [], updatedAt: Date.now() }
      return snapshot
    }
    if (!res.ok) {
      snapshot = { status: 'error', message: `Anthropic usage API error ${res.status}`, limits: [], updatedAt: Date.now() }
      return snapshot
    }

    const body = (await res.json()) as RawUsageResponse
    const { limits, credits } = parseUsageResponse(body)
    snapshot = { status: 'ok', limits, credits, updatedAt: Date.now() }
  } catch (error) {
    snapshot = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Network error',
      limits: [],
      updatedAt: Date.now(),
    }
  }

  return snapshot
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000

export const startClaudeUsageScheduler = (): void => {
  void refreshClaudeUsage()
  setInterval(() => void refreshClaudeUsage(), REFRESH_INTERVAL_MS)
}
