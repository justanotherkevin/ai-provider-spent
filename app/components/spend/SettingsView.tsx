import { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useConveyor } from '@/app/hooks/use-conveyor'
import type { ProviderId, ProviderSpend, SpendSnapshot } from '@/lib/conveyor/schemas/spend-schema'

type KeyStatus = Partial<Record<ProviderId, boolean>>

const KeyRow = ({
  spend,
  configured,
  onSave,
  onClear,
}: {
  spend: ProviderSpend
  configured: boolean
  onSave: (key: string) => Promise<void>
  onClear: () => Promise<void>
}) => {
  const [value, setValue] = useState('')

  return (
    <div className="key-row">
      <div className="key-row-header">
        <span className="key-row-name">{spend.name}</span>
        {configured && <span className="key-badge">Configured</span>}
      </div>
      {spend.access === 'unavailable' ? (
        <span className="provider-note">{spend.message}</span>
      ) : (
        <div className="key-row-controls">
          <input
            className="key-input"
            type="password"
            placeholder={configured ? '••••••••••••' : spend.keyLabel}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button
            className="key-button"
            disabled={!value}
            onClick={async () => {
              await onSave(value)
              setValue('')
            }}
          >
            Save
          </button>
          {configured && (
            <button className="key-button key-button-clear" onClick={onClear}>
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export const SettingsView = ({ onBack }: { onBack: () => void }) => {
  const spendApi = useConveyor('spend')
  const [status, setStatus] = useState<KeyStatus | null>(null)
  const [snapshot, setSnapshot] = useState<SpendSnapshot | null>(null)

  useEffect(() => {
    spendApi.keyStatus().then(setStatus)
    spendApi.snapshot().then((s) => (s.providers.length ? setSnapshot(s) : spendApi.refresh().then(setSnapshot)))
  }, [spendApi])

  const updateKey = async (provider: ProviderId, key: string) => {
    await spendApi.setKey(provider, key)
    setStatus(await spendApi.keyStatus())
    void spendApi.refresh()
  }

  return (
    <div className="popover">
      <header className="popover-header">
        <button className="icon-button" onClick={onBack} title="Back">
          <ChevronLeft size={15} />
        </button>
        <span className="popover-title">Settings</span>
        <span className="header-spacer" />
      </header>

      <div className="settings-body">
        <p className="settings-hint">
          Spend data comes from each provider's official billing API and needs an organization Admin API key. Keys are
          encrypted on disk with a key held in the macOS Keychain.
        </p>
        {snapshot && snapshot.providers.length > 0 ? (
          snapshot.providers.map((p) => (
            <KeyRow
              key={p.provider}
              spend={p}
              configured={status?.[p.provider] ?? false}
              onSave={(key) => updateKey(p.provider, key)}
              onClear={() => updateKey(p.provider, '')}
            />
          ))
        ) : (
          <div className="provider-note loading-note">Loading…</div>
        )}
      </div>
    </div>
  )
}
