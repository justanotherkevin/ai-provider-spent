import { z } from 'zod'

export const claudeUsageLimitSchema = z.object({
  kind: z.string(),
  label: z.string(),
  percent: z.number(),
  resetsAt: z.string().nullable(),
  isActive: z.boolean(),
})

export const claudeUsageCreditsSchema = z.object({
  enabled: z.boolean(),
  usedDollars: z.number(),
  limitDollars: z.number(),
  percent: z.number(),
})

export const claudeUsageSnapshotSchema = z.object({
  status: z.enum(['ok', 'no-token', 'error']),
  message: z.string().optional(),
  limits: z.array(claudeUsageLimitSchema),
  credits: claudeUsageCreditsSchema.nullable().optional(),
  updatedAt: z.number().nullable(),
})

export type ClaudeUsageSnapshot = z.infer<typeof claudeUsageSnapshotSchema>
export type ClaudeUsageLimit = z.infer<typeof claudeUsageLimitSchema>

export const claudeUsageIpcSchema = {
  'claude-usage-snapshot': {
    args: z.tuple([]),
    return: claudeUsageSnapshotSchema,
  },
  'claude-usage-refresh': {
    args: z.tuple([]),
    return: claudeUsageSnapshotSchema,
  },
}
