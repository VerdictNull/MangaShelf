import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useSettingsStore } from './store/settingsStore'
import { useDownloadStore } from './store/downloadStore'
import { AppLayout } from './components/layout/AppLayout'
import { HomePage } from './pages/HomePage'
import { LibraryPage } from './pages/LibraryPage'
import { SearchPage } from './pages/SearchPage'
import { MangaDetailPage } from './pages/MangaDetailPage'
import { ReaderPage } from './pages/ReaderPage'
import { CollectionsPage } from './pages/CollectionsPage'
import { DownloadsPage } from './pages/DownloadsPage'
import { SettingsPage } from './pages/SettingsPage'
import { CommandPalette, useCommandPaletteShortcut } from './components/CommandPalette'

function AppInner(): JSX.Element {
  useCommandPaletteShortcut()
  return (
    <>
      <Routes>
        {/* Reader runs fullscreen without the main layout */}
        <Route path="/reader/:mangaId/:chapterId" element={<ReaderPage />} />

        {/* All other pages use the main layout */}
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/manga/:id" element={<MangaDetailPage />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/downloads" element={<DownloadsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      <CommandPalette />
    </>
  )
}

export default function App(): JSX.Element {
  const loadSettings = useSettingsStore((s) => s.load)
  const loadQueue = useDownloadStore((s) => s.load)
  const updateFromEvent = useDownloadStore((s) => s.updateFromEvent)
  const markComplete = useDownloadStore((s) => s.markComplete)
  const settings = useSettingsStore((s) => s.settings)
  const qc = useQueryClient()

  useEffect(() => {
    loadSettings()
    loadQueue()

    // Subscribe to download events from main process
    const unsubProgress = window.mangaApi.onDownloadProgress((evt) => {
      updateFromEvent(evt)
    })
    const unsubComplete = window.mangaApi.onDownloadComplete((evt) => {
      markComplete(evt.chapterId, evt.success)
      if (evt.success) {
        qc.invalidateQueries({ queryKey: ['chapters', evt.mangaId] })
        qc.invalidateQueries({ queryKey: ['orphanedDownloads'] })
      }
    })

    // library:updated fires from: download complete, download delete, library add/remove/update
    // Handle globally here so it works regardless of which page is currently mounted
    const unsubLibrary = window.mangaApi.onLibraryUpdated(() => {
      qc.invalidateQueries({ queryKey: ['library'] })
      qc.invalidateQueries({ queryKey: ['libraryCounts'] })
      qc.invalidateQueries({ queryKey: ['orphanedDownloads'] })
    })

    return () => {
      unsubProgress()
      unsubComplete()
      unsubLibrary()
    }
  }, [])

  // Apply theme class and accessibility settings
  useEffect(() => {
    if (!settings) return
    const root = document.documentElement

    // Theme
    if (settings.theme === 'dark') {
      root.classList.remove('light')
    } else if (settings.theme === 'light') {
      root.classList.add('light')
    } else {
      // System preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (!prefersDark) root.classList.add('light')
    }

    // High contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }

    // Font size
    root.dataset.fontSize = settings.fontSize

    // Reduce motion
    if (settings.reduceMotion) {
      root.classList.add('motion-reduce')
    } else {
      root.classList.remove('motion-reduce')
    }
  }, [settings])

  return (
    <HashRouter>
      <AppInner />
    </HashRouter>
  )
}
