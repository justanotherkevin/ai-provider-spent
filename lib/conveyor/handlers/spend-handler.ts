import { handle } from '@/lib/main/shared'
import { getSnapshot, refreshSpend, monthToDateTotal } from '@/lib/main/spend'
import { setTrayTitle } from '@/lib/main/tray'
import { setKey } from '@/lib/main/keystore'
import { getKeyStatus } from '@/lib/main/providers'

export const registerSpendHandlers = () => {
  handle('spend-snapshot', () => getSnapshot())

  handle('spend-refresh', async () => {
    const snapshot = await refreshSpend()
    const total = monthToDateTotal(snapshot)
    setTrayTitle(total === null ? '' : ` $${total.toFixed(2)}`)
    return snapshot
  })

  handle('keys-status', () => getKeyStatus())

  handle('keys-set', (provider, key) => {
    setKey(provider, key)
  })
}
