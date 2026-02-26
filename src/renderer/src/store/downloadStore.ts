import { create } from 'zustand'
import type { DownloadProgressEvent, DownloadQueueItem } from '@shared/types'
import { getDownloadQueue, cancelDownload, retryDownload, pauseDownload, deleteDownload } from '@renderer/lib/api'

interface DownloadStore {
  queue: DownloadQueueItem[]
  initialized: boolean
  load: () => Promise<void>
  addItem: (item: DownloadQueueItem) => void
  updateFromEvent: (event: DownloadProgressEvent) => void
  markComplete: (chapterId: string, success: boolean) => void
  cancel: (queueId: number) => void
  retry: (queueId: number) => void
  pause: (queueId: number) => void
  deleteChapter: (chapterId: string, mangaId: string) => Promise<void>
}

export const useDownloadStore = create<DownloadStore>((set, get) => ({
  queue: [],
  initialized: false,

  load: async () => {
    const queue = await getDownloadQueue()
    set({ queue, initialized: true })
  },

  addItem: (item) => {
    set((state) => ({
      queue: state.queue.some((q) => q.id === item.id)
        ? state.queue
        : [...state.queue, item]
    }))
  },

  updateFromEvent: (event) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === event.queueId
          ? {
              ...item,
              status: event.status,
              progressPages: event.progressPages,
              totalPages: event.totalPages ?? item.totalPages
            }
          : item
      )
    }))
  },

  markComplete: (chapterId, success) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.chapterId === chapterId
          ? { ...item, status: success ? 'completed' : 'failed' }
          : item
      )
    }))
  },

  cancel: (queueId) => {
    cancelDownload(queueId)
    set((state) => ({ queue: state.queue.filter((item) => item.id !== queueId) }))
  },

  retry: (queueId) => {
    retryDownload(queueId)
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === queueId ? { ...item, status: 'pending', errorMessage: null } : item
      )
    }))
  },

  pause: (queueId) => {
    pauseDownload(queueId)
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === queueId ? { ...item, status: 'paused' } : item
      )
    }))
  },

  deleteChapter: async (chapterId, mangaId) => {
    await deleteDownload(chapterId, mangaId)
    set((state) => ({ queue: state.queue.filter((item) => item.chapterId !== chapterId) }))
  }
}))
