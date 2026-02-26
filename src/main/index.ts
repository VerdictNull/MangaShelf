import { app, BrowserWindow, shell, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import log from 'electron-log/main'
import { ensureAppDirs } from './appPaths'
import { initDatabase, closeDatabase } from './db/database'
import { getWindowState, saveWindowState, isValidWindowState } from './windowManager'
import { startLocalPageServer, stopLocalPageServer } from './services/localPageServer'
import { initDownloadService, resumeOnStart } from './services/downloadService'
import { initUpdateService, stopUpdateService } from './services/updateService'
import { initAppUpdater } from './services/appUpdater'
import { registerAllHandlers } from './ipc'
import { MangaRepository } from './db/repositories/mangaRepository'
import { ChapterRepository } from './db/repositories/chapterRepository'
import { LibraryRepository } from './db/repositories/libraryRepository'
import { ReadingProgressRepository } from './db/repositories/readingProgressRepository'
import { CollectionRepository } from './db/repositories/collectionRepository'
import { DownloadRepository } from './db/repositories/downloadRepository'
import { SettingsRepository } from './db/repositories/settingsRepository'

log.info('App starting...')

// Suppress default menu
app.applicationMenu = null

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

async function createWindow(): Promise<void> {
  const state = getWindowState()
  const validState = isValidWindowState(state)

  mainWindow = new BrowserWindow({
    width: validState ? state.width : 1280,
    height: validState ? state.height : 800,
    x: validState ? state.x : undefined,
    y: validState ? state.y : undefined,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f0f11',
      symbolColor: '#e5e5e5',
      height: 36
    },
    backgroundColor: '#0f0f11',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
    if (state.isMaximized) mainWindow!.maximize()
  })

  mainWindow.on('close', () => {
    if (mainWindow) saveWindowState(mainWindow)
  })

  // Save state on resize/move
  mainWindow.on('resize', () => { if (mainWindow) saveWindowState(mainWindow) })
  mainWindow.on('move', () => { if (mainWindow) saveWindowState(mainWindow) })

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // F11 toggles fullscreen (always active — escape hatch if app relaunches in fullscreen)
  mainWindow.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      mainWindow!.setFullScreen(!mainWindow!.isFullScreen())
    }
  })

  // F12 / Ctrl+Shift+I opens DevTools in dev mode
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.webContents.on('before-input-event', (_e, input) => {
      if (
        input.key === 'F12' ||
        (input.control && input.shift && input.key === 'I')
      ) {
        mainWindow!.webContents.toggleDevTools()
      }
    })
  }

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createTray(): void {
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)
  tray.setToolTip('MangaShelf')

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open MangaShelf', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ])

  tray.setContextMenu(contextMenu)
  tray.on('click', () => mainWindow?.show())
}

app.whenReady().then(async () => {
  try {
    ensureAppDirs()
    const db = initDatabase()

    // Initialize repositories
    const mangaRepo = new MangaRepository(db)
    const chapterRepo = new ChapterRepository(db)
    const libraryRepo = new LibraryRepository(db)
    const progressRepo = new ReadingProgressRepository(db)
    const collectionRepo = new CollectionRepository(db)
    const downloadRepo = new DownloadRepository(db)
    const settingsRepo = new SettingsRepository(db)

    // Start local page server for offline reading
    const pageServerPort = await startLocalPageServer()
    log.info('Page server port:', pageServerPort)

    // Initialize download service
    initDownloadService({ downloadRepo, chapterRepo })

    // Initialize chapter update checker (runs every 12h)
    initUpdateService({ chapterRepo, libraryRepo, settingsRepo })

    // Register all IPC handlers
    registerAllHandlers({
      mangaRepo,
      chapterRepo,
      libraryRepo,
      progressRepo,
      collectionRepo,
      downloadRepo,
      settingsRepo,
      pageServerPort
    })

    await createWindow()
    createTray()

    // Resume any interrupted downloads
    resumeOnStart()

    // Check GitHub Releases for app updates (~10s after startup)
    initAppUpdater()

    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) await createWindow()
    })
  } catch (err) {
    log.error('Fatal startup error:', err)
    app.quit()
  }
})

app.on('window-all-closed', () => {
  // Keep running in tray on Windows/Linux
  if (process.platform === 'darwin') app.quit()
})

app.on('before-quit', async () => {
  stopUpdateService()
  closeDatabase()
  await stopLocalPageServer()
  tray?.destroy()
})
