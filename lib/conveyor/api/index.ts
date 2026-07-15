import { electronAPI } from '@electron-toolkit/preload'
import { AppApi } from './app-api'
import { WindowApi } from './window-api'
import { SpendApi } from './spend-api'

export const conveyor = {
  app: new AppApi(electronAPI),
  window: new WindowApi(electronAPI),
  spend: new SpendApi(electronAPI),
}

export type ConveyorApi = typeof conveyor
