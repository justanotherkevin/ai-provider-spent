import { useState } from 'react'
import { SpendView } from '@/app/components/spend/SpendView'
import { SettingsView } from '@/app/components/spend/SettingsView'
import './styles/app.css'

export default function App() {
  const [view, setView] = useState<'spend' | 'settings'>('spend')

  return view === 'spend' ? (
    <SpendView onOpenSettings={() => setView('settings')} />
  ) : (
    <SettingsView onBack={() => setView('spend')} />
  )
}
