// App-level auto-updater using electron-updater + GitHub Releases.
// This is NOT the manga chapter update checker — see updateService.ts for that.

import { app, Notification } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateDownloadedEvent } from 'electron-updater'
import log from 'electron-log/main'

const STARTUP_DELAY_MS = 10_000

export function initAppUpdater(): void {
  // In dev mode app-update.yml doesn't exist — skip entirely.
  if (!app.isPackaged) {
    log.info('[appUpdater] Skipping in dev mode (app.isPackaged = false)')
    return
  }

  // Route electron-updater logs through electron-log so they appear in the
  // same log file as the rest of the app (%APPDATA%\mangashelf\logs\).
  autoUpdater.logger = log
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    log.info('[appUpdater] Checking for update...')
  })

  autoUpdater.on('update-available', (info) => {
    log.info(`[appUpdater] Update available: v${info.version}`)
  })

  autoUpdater.on('update-not-available', (info) => {
    log.info(`[appUpdater] Already up to date (v${info.version})`)
  })

  autoUpdater.on('download-progress', (progress) => {
    log.info(`[appUpdater] Downloading... ${Math.round(progress.percent)}%`)
  })

  autoUpdater.on('update-downloaded', (event: UpdateDownloadedEvent) => {
    log.info(`[appUpdater] Update ready to install: v${event.version}`)

    if (Notification.isSupported()) {
      new Notification({
        title: 'MangaShelf Update Ready',
        body: `Version ${event.version} has been downloaded. Restart MangaShelf to apply it.`
      }).show()
    }
  })

  autoUpdater.on('error', (err) => {
    log.error('[appUpdater] Update error:', err.message)
  })

  // Delay the first check so it doesn't race with startup tasks.
  setTimeout(() => {
    log.info('[appUpdater] Running startup update check...')
    autoUpdater.checkForUpdates().catch((err) => {
      log.error('[appUpdater] checkForUpdates threw:', err)
    })
  }, STARTUP_DELAY_MS)
}
