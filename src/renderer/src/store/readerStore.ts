import { create } from 'zustand'
import type { Chapter, ReaderMode, ReadingDirection, ZoomMode } from '@shared/types'
import { getChapterPages, saveProgress } from '@renderer/lib/api'

interface PageEntry {
  url: string
  loaded: boolean
}

interface ReaderStore {
  // Session
  mangaId: string | null
  chapterId: string | null
  chapterList: Chapter[]
  currentChapterIndex: number

  // Pages
  pages: PageEntry[]
  currentPage: number
  totalPages: number
  source: 'online' | 'local' | null

  // Display
  mode: ReaderMode
  direction: ReadingDirection
  zoom: number
  zoomMode: ZoomMode

  // UI
  showControls: boolean
  showThumbnails: boolean
  isLoading: boolean
  error: string | null

  // Actions
  openChapter: (mangaId: string, chapterId: string, chapterList: Chapter[]) => Promise<void>
  setPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  nextChapter: () => Promise<void>
  prevChapter: () => Promise<void>
  setMode: (mode: ReaderMode) => void
  setDirection: (dir: ReadingDirection) => void
  setZoom: (zoom: number) => void
  cycleZoomMode: () => void
  toggleControls: () => void
  toggleThumbnails: () => void
  setPageLoaded: (index: number) => void
  resetUI: () => void
  close: () => void
}

const ZOOM_MODES: ZoomMode[] = ['fit-width', 'fit-height', 'original']

export const useReaderStore = create<ReaderStore>((set, get) => ({
  mangaId: null,
  chapterId: null,
  chapterList: [],
  currentChapterIndex: 0,
  pages: [],
  currentPage: 0,
  totalPages: 0,
  source: null,
  mode: 'single',
  direction: 'ltr',
  zoom: 1,
  zoomMode: 'fit-width',
  showControls: true,
  showThumbnails: false,
  isLoading: false,
  error: null,

  openChapter: async (mangaId, chapterId, chapterList) => {
    set({ isLoading: true, error: null, pages: [], currentPage: 0, showControls: true })
    try {
      const chapterIndex = chapterList.findIndex((c) => c.id === chapterId)
      const { pages, source } = await getChapterPages(chapterId)
      set({
        mangaId,
        chapterId,
        chapterList,
        currentChapterIndex: chapterIndex >= 0 ? chapterIndex : 0,
        pages: pages.map((url) => ({ url, loaded: false })),
        totalPages: pages.length,
        source,
        isLoading: false
      })
    } catch (err: any) {
      set({ isLoading: false, error: err.message })
    }
  },

  setPage: (page) => {
    const { totalPages, mangaId, chapterId } = get()
    const clamped = Math.max(0, Math.min(page, totalPages - 1))
    set({ currentPage: clamped })

    if (mangaId && chapterId) {
      saveProgress({
        mangaId,
        chapterId,
        currentPage: clamped,
        totalPages,
        isCompleted: clamped >= totalPages - 1
      })
    }
  },

  nextPage: () => {
    const { currentPage, totalPages, mode } = get()
    const increment = mode === 'double' ? 2 : 1
    if (currentPage + increment >= totalPages) {
      get().nextChapter()
    } else {
      get().setPage(currentPage + increment)
    }
  },

  prevPage: () => {
    const { currentPage, mode } = get()
    const decrement = mode === 'double' ? 2 : 1
    if (currentPage - decrement < 0) {
      get().prevChapter()
    } else {
      get().setPage(currentPage - decrement)
    }
  },

  nextChapter: async () => {
    const { chapterList, currentChapterIndex, mangaId } = get()
    const nextIndex = currentChapterIndex + 1
    if (nextIndex >= chapterList.length || !mangaId) return
    const next = chapterList[nextIndex]
    await get().openChapter(mangaId, next.id, chapterList)
  },

  prevChapter: async () => {
    const { chapterList, currentChapterIndex, mangaId } = get()
    const prevIndex = currentChapterIndex - 1
    if (prevIndex < 0 || !mangaId) return
    const prev = chapterList[prevIndex]
    await get().openChapter(mangaId, prev.id, chapterList)
  },

  setMode: (mode) => set({ mode }),
  setDirection: (direction) => set({ direction }),
  setZoom: (zoom) => set({ zoom }),

  cycleZoomMode: () => {
    const { zoomMode } = get()
    const idx = ZOOM_MODES.indexOf(zoomMode)
    set({ zoomMode: ZOOM_MODES[(idx + 1) % ZOOM_MODES.length] })
  },

  toggleControls: () => set((s) => ({ showControls: !s.showControls })),
  toggleThumbnails: () => set((s) => ({ showThumbnails: !s.showThumbnails })),
  resetUI: () => set({ showControls: true, showThumbnails: false }),
  setPageLoaded: (index) =>
    set((s) => ({
      pages: s.pages.map((p, i) => (i === index ? { ...p, loaded: true } : p))
    })),

  close: () =>
    set({
      mangaId: null,
      chapterId: null,
      pages: [],
      currentPage: 0,
      totalPages: 0,
      source: null,
      isLoading: false,
      error: null
    })
}))
