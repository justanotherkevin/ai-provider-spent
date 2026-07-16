import { handle } from '@/lib/main/shared'
import { getClaudeUsageSnapshot, refreshClaudeUsage } from '@/lib/main/claude-code-usage'

export const registerClaudeUsageHandlers = () => {
  handle('claude-usage-snapshot', () => getClaudeUsageSnapshot())

  handle('claude-usage-refresh', () => refreshClaudeUsage())
}
