import { create } from 'zustand'
import type { AppSettings } from '@shared/types'
import { getSettings, updateSetting, updateSettings } from '@renderer/lib/api'

interface SettingsStore {
  settings: AppSettings | null
  loaded: boolean
  load: () => Promise<void>
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>
  updateMany: (updates: Partial<AppSettings>) => Promise<void>
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  readerMode: 'single',
  readingDirection: 'ltr',
  imageQuality: 'data-saver',
  downloadConcurrency: 3,
  prefetchPages: 5,
  language: 'en',
  contentRatings: ['safe', 'suggestive'],
  highContrast: false,
  fontSize: 'medium',
  animationsEnabled: true,
  reduceMotion: false,
  downloadLocation: null,
  maxCacheGB: 10,
  autoDownloadNewChapters: false,
  showPageNumbers: true,
  backgroundStyle: 'black'
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: null,
  loaded: false,

  load: async () => {
    try {
      const s = await getSettings()
      set({ settings: { ...DEFAULT_SETTINGS, ...s }, loaded: true })
    } catch {
      set({ settings: DEFAULT_SETTINGS, loaded: true })
    }
  },

  update: async (key, value) => {
    const current = get().settings ?? DEFAULT_SETTINGS
    set({ settings: { ...current, [key]: value } })
    await updateSetting(key, value)
  },

  updateMany: async (updates) => {
    const current = get().settings ?? DEFAULT_SETTINGS
    set({ settings: { ...current, ...updates } })
    await updateSettings(updates)
  }
}))
