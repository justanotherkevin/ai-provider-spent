import type { z } from 'zod'
import type { providerIdSchema } from '@/lib/conveyor/schemas/spend-schema'

export type ProviderId = z.infer<typeof providerIdSchema>

export const PROVIDERS: { id: ProviderId; name: string }[] = [
  { id: 'anthropic', name: 'Anthropic' },
  { id: 'openai', name: 'OpenAI' },
  { id: 'google', name: 'Google Gemini' },
]
