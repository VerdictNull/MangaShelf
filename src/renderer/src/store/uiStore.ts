import { create } from 'zustand'

interface UiStore {
  sidebarCollapsed: boolean
  commandPaletteOpen: boolean
  downloadPanelOpen: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
  openCommandPalette: () => void
  closeCommandPalette: () => void
  toggleDownloadPanel: () => void
}

export const useUiStore = create<UiStore>((set) => ({
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  downloadPanelOpen: false,

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  toggleDownloadPanel: () => set((s) => ({ downloadPanelOpen: !s.downloadPanelOpen }))
}))
