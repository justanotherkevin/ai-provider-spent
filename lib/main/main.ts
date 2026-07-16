import { Menu, app } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createTrayApp, setTrayTitle } from './tray'
import { registerResourcesProtocol } from './protocols'
import { registerWindowHandlers } from '@/lib/conveyor/handlers/window-handler'
import { registerAppHandlers } from '@/lib/conveyor/handlers/app-handler'
import { registerSpendHandlers } from '@/lib/conveyor/handlers/spend-handler'
import { registerClaudeUsageHandlers } from '@/lib/conveyor/handlers/claude-usage-handler'
import { startSpendScheduler, monthToDateTotal } from './spend'
import { startClaudeUsageScheduler } from './claude-code-usage'

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.desktop-ai-spent')

  // Menu bar app: no dock icon, but keep an Edit menu so Cmd+V works in inputs
  app.dock?.hide()
  Menu.setApplicationMenu(Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }]))

  registerResourcesProtocol()
  const popover = createTrayApp()

  registerWindowHandlers(popover)
  registerAppHandlers(app)
  registerSpendHandlers()
  registerClaudeUsageHandlers()

  startSpendScheduler((snapshot) => {
    const total = monthToDateTotal(snapshot)
    setTrayTitle(total === null ? '' : ` $${total.toFixed(2)}`)
  })
  startClaudeUsageScheduler()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
})

// Menu bar app lives until explicitly quit; the popover only hides, never closes.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
