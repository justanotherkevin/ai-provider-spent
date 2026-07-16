import { ConveyorApi } from '@/lib/preload/shared'

export class ClaudeUsageApi extends ConveyorApi {
  snapshot = () => this.invoke('claude-usage-snapshot')
  refresh = () => this.invoke('claude-usage-refresh')
}
