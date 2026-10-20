import { execFile, execFileSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { promisify } from 'util'
import { z } from 'zod'

const USAGE_API_URL = 'https://api.anthropic.com/api/oauth/usage'
const FALLBACK_CLAUDE_VERSION = '2.1.204'

const execFileAsync = promisify(execFile)

let cachedUserAgent: Promise<string> | undefined

// The usage endpoint is undocumented and expects a Claude Code user agent.
const claudeCodeUserAgent = (): Promise<string> => {
  cachedUserAgent ??= (async () => {
    let version = FALLBACK_CLAUDE_VERSION
    try {
      // Finder-launched apps get a minimal PATH, so add the usual install locations
      const extra = [join(homedir(), '.local/bin'), '/opt/homebrew/bin', '/usr/local/bin']
      const PATH = [...extra, process.env.PATH].filter(Boolean).join(':')
      const { stdout } = await execFileAsync('claude', ['--version'], {
        encoding: 'utf8',
        timeout: 3000,
        env: { ...process.env, PATH },
      })
      const match = stdout.match(/^\s*(\d+\.\d+\.\d+)/)
      if (match) version = match[1]
    } catch {
      // keep fallback
    }
    return `claude-code/${version}`
  })()
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

const limitEntrySchema = z.object({
  kind: z.string(),
  percent: z.number(),
  resets_at: z.string().nullable().catch(null),
  is_active: z.boolean().catch(false),
  scope: z
    .object({
      model: z
        .object({ display_name: z.string().optional().catch(undefined) })
        .nullish()
        .catch(null),
    })
    .nullish()
    .catch(null),
})

const extraUsageSchema = z.object({
  is_enabled: z.boolean(),
  monthly_limit: z.number().nullable(),
  used_credits: z.number().nullable(),
  utilization: z.number().nullable(),
})

type LimitEntry = z.infer<typeof limitEntrySchema>

const labelForLimit = (entry: LimitEntry): string => {
  if (entry.kind === 'session') return 'Current session'
  if (entry.kind === 'weekly_all') return 'All models'
  return entry.scope?.model?.display_name ?? 'Weekly'
}

/** Turns the raw usage response into limits and credits, skipping anything malformed. Returns null if the body is not an object. */
export const parseUsageResponse = (
  body: unknown
): { limits: ClaudeUsageLimit[]; credits: ClaudeUsageCredits | null } | null => {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null
  const raw = body as { limits?: unknown; extra_usage?: unknown }

  const limits: ClaudeUsageLimit[] = []
  for (const item of Array.isArray(raw.limits) ? raw.limits : []) {
    const parsed = limitEntrySchema.safeParse(item)
    if (!parsed.success) continue
    const entry = parsed.data
    limits.push({
      kind: entry.kind,
      label: labelForLimit(entry),
      percent: entry.percent,
      resetsAt: entry.resets_at,
      isActive: entry.is_active,
    })
  }

  const extra = extraUsageSchema.safeParse(raw.extra_usage)
  const credits: ClaudeUsageCredits | null =
    extra.success && extra.data.is_enabled
      ? {
          enabled: true,
          usedDollars: extra.data.used_credits ?? 0,
          limitDollars: (extra.data.monthly_limit ?? 0) / 100, // monthly_limit is in cents
          percent: extra.data.utilization ?? 0,
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
    const userAgent = await claudeCodeUserAgent()
    const res = await fetch(USAGE_API_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
        'anthropic-beta': 'oauth-2025-04-20',
      },
    })

    if (res.status === 401) {
      snapshot = {
        status: 'no-token',
        message: 'Claude Code session expired — log in again',
        limits: [],
        updatedAt: Date.now(),
      }
      return snapshot
    }
    if (!res.ok) {
      snapshot = {
        status: 'error',
        message: `Anthropic usage API error ${res.status}`,
        limits: [],
        updatedAt: Date.now(),
      }
      return snapshot
    }

    const parsed = parseUsageResponse(await res.json())
    if (!parsed) {
      snapshot = { status: 'error', message: 'Unexpected Claude usage response', limits: [], updatedAt: Date.now() }
      return snapshot
    }
    snapshot = { status: 'ok', limits: parsed.limits, credits: parsed.credits, updatedAt: Date.now() }
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
