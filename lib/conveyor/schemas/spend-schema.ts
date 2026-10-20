import { z } from 'zod'

export const providerIdSchema = z.enum(['anthropic', 'openai', 'deepseek', 'google'])

export type ProviderId = z.infer<typeof providerIdSchema>

export const providerAccessSchema = z.enum(['api-key', 'unavailable'])
export type ProviderAccess = z.infer<typeof providerAccessSchema>

export const providerSpendSchema = z.object({
  provider: providerIdSchema,
  name: z.string(),
  access: providerAccessSchema,
  keyLabel: z.string().optional(),
  keyHelp: z.string().optional(),
  status: z.enum(['ok', 'no-key', 'unavailable', 'error']),
  message: z.string().optional(),
  dailyCosts: z.array(z.object({ date: z.string(), amount: z.number() })),
})

export const spendSnapshotSchema = z.object({
  providers: z.array(providerSpendSchema),
  updatedAt: z.number().nullable(),
})

export const keyStatusSchema = z.partialRecord(providerIdSchema, z.boolean())

export type SpendSnapshot = z.infer<typeof spendSnapshotSchema>
export type ProviderSpend = z.infer<typeof providerSpendSchema>

export const spendIpcSchema = {
  'spend-snapshot': {
    args: z.tuple([]),
    return: spendSnapshotSchema,
  },
  'spend-refresh': {
    args: z.tuple([]),
    return: spendSnapshotSchema,
  },
  'keys-status': {
    args: z.tuple([]),
    return: keyStatusSchema,
  },
  // Empty string clears the key. Keys are write-only from the renderer's perspective.
  'keys-set': {
    args: z.tuple([providerIdSchema, z.string()]),
    return: z.void(),
  },
}
