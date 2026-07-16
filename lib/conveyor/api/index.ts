import { electronAPI } from '@electron-toolkit/preload'
import { AppApi } from './app-api'
import { WindowApi } from './window-api'
import { SpendApi } from './spend-api'
import { ClaudeUsageApi } from './claude-usage-api'

export const conveyor = {
  app: new AppApi(electronAPI),
  window: new WindowApi(electronAPI),
  spend: new SpendApi(electronAPI),
  claudeUsage: new ClaudeUsageApi(electronAPI),
}

export type ConveyorApi = typeof conveyor
