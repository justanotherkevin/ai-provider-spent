import { app, safeStorage } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

export type ProviderId = 'anthropic' | 'openai' | 'google'

export const PROVIDER_IDS: ProviderId[] = ['anthropic', 'openai', 'google']

const keysFile = () => join(app.getPath('userData'), 'keys.enc')

type StoredKeys = Partial<Record<ProviderId, string>> // base64 of safeStorage-encrypted key

const readStore = (): StoredKeys => {
  if (!existsSync(keysFile())) return {}
  try {
    return JSON.parse(readFileSync(keysFile(), 'utf8')) as StoredKeys
  } catch {
    return {}
  }
}

const writeStore = (store: StoredKeys) => {
  writeFileSync(keysFile(), JSON.stringify(store), { mode: 0o600 })
}

export const getKey = (provider: ProviderId): string | null => {
  const encrypted = readStore()[provider]
  if (!encrypted) return null
  try {
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
  } catch {
    return null
  }
}

/** Empty string clears the stored key. */
export const setKey = (provider: ProviderId, key: string): void => {
  const store = readStore()
  if (!key) {
    delete store[provider]
  } else {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('OS keychain encryption is not available')
    }
    store[provider] = safeStorage.encryptString(key).toString('base64')
  }
  writeStore(store)
}

export const getKeyStatus = (): Record<ProviderId, boolean> => {
  const store = readStore()
  return {
    anthropic: Boolean(store.anthropic),
    openai: Boolean(store.openai),
    google: Boolean(store.google),
  }
}
