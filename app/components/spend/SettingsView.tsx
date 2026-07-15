import { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useConveyor } from '@/app/hooks/use-conveyor'
import { PROVIDERS, type ProviderId } from './providers'

type KeyStatus = Record<ProviderId, boolean>

const KeyRow = ({
  provider,
  name,
  configured,
  onSave,
  onClear,
}: {
  provider: ProviderId
  name: string
  configured: boolean
  onSave: (key: string) => Promise<void>
  onClear: () => Promise<void>
}) => {
  const [value, setValue] = useState('')
  const disabled = provider === 'google'

  return (
    <div className="key-row">
      <div className="key-row-header">
        <span className="key-row-name">{name}</span>
        {configured && <span className="key-badge">Configured</span>}
      </div>
      {disabled ? (
        <span className="provider-note">Not supported yet — requires Cloud Billing export</span>
      ) : (
        <div className="key-row-controls">
          <input
            className="key-input"
            type="password"
            placeholder={configured ? '••••••••••••' : 'Admin API key'}
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

  useEffect(() => {
    spendApi.keyStatus().then(setStatus)
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
        {PROVIDERS.map((p) => (
          <KeyRow
            key={p.id}
            provider={p.id}
            name={p.name}
            configured={status?.[p.id] ?? false}
            onSave={(key) => updateKey(p.id, key)}
            onClear={() => updateKey(p.id, '')}
          />
        ))}
      </div>
    </div>
  )
}
