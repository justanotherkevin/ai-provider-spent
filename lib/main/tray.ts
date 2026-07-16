import { BrowserWindow, Tray, app, nativeImage, shell } from 'electron'
import { readFileSync } from 'fs'
import { join } from 'path'
import trayIcon1x from '@/resources/trayTemplate.png?asset'
import trayIcon2x from '@/resources/trayTemplate@2x.png?asset'

const POPOVER_WIDTH = 320
const POPOVER_HEIGHT = 480

let tray: Tray | null = null
let popover: BrowserWindow | null = null

const createPopover = (): BrowserWindow => {
  const window = new BrowserWindow({
    width: POPOVER_WIDTH,
    height: POPOVER_HEIGHT,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    vibrancy: 'menu',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
    },
  })

  window.on('blur', () => window.hide())

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}

const positionPopover = (window: BrowserWindow, trayBounds: Electron.Rectangle) => {
  const x = Math.round(trayBounds.x + trayBounds.width / 2 - POPOVER_WIDTH / 2)
  const y = Math.round(trayBounds.y + trayBounds.height + 4)
  window.setPosition(x, y, false)
}

const togglePopover = () => {
  if (!popover || !tray) return
  if (popover.isVisible()) {
    popover.hide()
  } else {
    positionPopover(popover, tray.getBounds())
    popover.show()
    popover.focus()
  }
}

export function createTrayApp(): BrowserWindow {
  const icon = nativeImage.createEmpty()
  icon.addRepresentation({ scaleFactor: 1, buffer: readFileSync(trayIcon1x) })
  icon.addRepresentation({ scaleFactor: 2, buffer: readFileSync(trayIcon2x) })
  icon.setTemplateImage(true)

  tray = new Tray(icon)
  tray.setToolTip('AI Spend')
  tray.on('click', togglePopover)

  popover = createPopover()
  return popover
}

/** Text shown next to the menu bar icon; empty string clears it (icon only). */
export function setTrayTitle(title: string): void {
  tray?.setTitle(title, { fontType: 'monospacedDigit' })
}
