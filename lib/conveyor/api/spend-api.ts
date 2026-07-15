import { ConveyorApi } from '@/lib/preload/shared'
import type { z } from 'zod'
import type { providerIdSchema } from '@/lib/conveyor/schemas/spend-schema'

type ProviderId = z.infer<typeof providerIdSchema>

export class SpendApi extends ConveyorApi {
  snapshot = () => this.invoke('spend-snapshot')
  refresh = () => this.invoke('spend-refresh')
  keyStatus = () => this.invoke('keys-status')
  setKey = (provider: ProviderId, key: string) => this.invoke('keys-set', provider, key)
}
