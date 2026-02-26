import type { ReadStatus } from '@shared/types'

export function formatChapterNumber(num: number | null | undefined): string {
  if (num == null) return '?'
  return Number.isInteger(num) ? `Ch. ${num}` : `Ch. ${num.toFixed(1)}`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(timestamp))
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(months / 12)

  if (years > 0) return `${years}y ago`
  if (months > 0) return `${months}mo ago`
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

export const READ_STATUS_LABELS: Record<ReadStatus, string> = {
  reading: 'Reading',
  completed: 'Completed',
  dropped: 'Dropped',
  on_hold: 'On Hold',
  plan_to_read: 'Plan to Read'
}

export const READ_STATUS_COLORS: Record<ReadStatus, string> = {
  reading: 'text-blue-400',
  completed: 'text-green-400',
  dropped: 'text-red-400',
  on_hold: 'text-yellow-400',
  plan_to_read: 'text-gray-400'
}

export const MANGA_STATUS_LABELS: Record<string, string> = {
  ongoing: 'Ongoing',
  completed: 'Completed',
  hiatus: 'Hiatus',
  cancelled: 'Cancelled'
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

export function buildCoverUrl(mangaId: string, filename: string, localPath?: string | null): string {
  if (localPath) {
    // Use local file server URL pattern
    return `file://${localPath}`
  }
  return `https://uploads.mangadex.org/covers/${mangaId}/${filename}.256.jpg`
}
