import { useDownloadStore } from '@renderer/store/downloadStore'
import { X, RotateCcw, PauseCircle, CheckCircle, AlertCircle, Loader2, Clock, Trash2 } from 'lucide-react'
import { formatFileSize } from '@renderer/lib/formatters'
import { cn } from '@renderer/lib/cn'
import type { DownloadQueueItem } from '@shared/types'
import { useQueryClient } from '@tanstack/react-query'

const STATUS_ICONS = {
  pending: Clock,
  downloading: Loader2,
  paused: PauseCircle,
  completed: CheckCircle,
  failed: AlertCircle
}

const STATUS_COLORS = {
  pending: 'text-muted-foreground',
  downloading: 'text-info',
  paused: 'text-warning',
  completed: 'text-success',
  failed: 'text-destructive'
}

export function DownloadsPage(): JSX.Element {
  const { queue, cancel, retry, pause, deleteChapter } = useDownloadStore()
  const qc = useQueryClient()
  const active = queue.filter((q) => q.status !== 'completed' && q.status !== 'failed')
  const completed = queue.filter((q) => q.status === 'completed')
  const failed = queue.filter((q) => q.status === 'failed')

  const handleDelete = async (item: DownloadQueueItem) => {
    await deleteChapter(item.chapterId, item.mangaId)
    qc.invalidateQueries({ queryKey: ['chapters', item.mangaId] })
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-lg mx-auto">
      <h1 className="text-lg font-semibold">Downloads</h1>

      {queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <CheckCircle size={40} className="text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">No downloads queued</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">Active</h2>
              {active.map((item) => (
                <DownloadItem key={item.id} item={item} onCancel={cancel} onRetry={retry} onPause={pause} onDelete={handleDelete} />
              ))}
            </section>
          )}

          {failed.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">Failed</h2>
              {failed.map((item) => (
                <DownloadItem key={item.id} item={item} onCancel={cancel} onRetry={retry} onPause={pause} onDelete={handleDelete} />
              ))}
            </section>
          )}

          {completed.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">Completed</h2>
              {completed.slice(0, 20).map((item) => (
                <DownloadItem key={item.id} item={item} onCancel={cancel} onRetry={retry} onPause={pause} onDelete={handleDelete} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  )
}

function DownloadItem({
  item,
  onCancel,
  onRetry,
  onPause,
  onDelete
}: {
  item: DownloadQueueItem
  onCancel: (id: number) => void
  onRetry: (id: number) => void
  onPause: (id: number) => void
  onDelete: (item: DownloadQueueItem) => void
}): JSX.Element {
  const StatusIcon = STATUS_ICONS[item.status]
  const pct =
    item.totalPages && item.totalPages > 0
      ? Math.round((item.progressPages / item.totalPages) * 100)
      : 0

  return (
    <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border/50">
      <StatusIcon
        size={18}
        className={cn(STATUS_COLORS[item.status], item.status === 'downloading' && 'animate-spin')}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            {item.mangaTitle && (
              <p className="text-xs text-muted-foreground truncate">{item.mangaTitle}</p>
            )}
            <p className="text-sm truncate">
              {item.chapterNumber != null
                ? `Chapter ${item.chapterNumber}${item.chapterTitle ? ` — ${item.chapterTitle}` : ''}`
                : item.chapterTitle ?? `Chapter ${item.chapterId.slice(0, 8)}…`}
            </p>
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {item.status === 'downloading' && item.totalPages
              ? `${item.progressPages} / ${item.totalPages} pages`
              : item.status === 'failed'
              ? item.errorMessage ?? 'Failed'
              : item.status}
          </span>
        </div>

        {item.status === 'downloading' && item.totalPages && (
          <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        {item.status === 'failed' && (
          <button
            onClick={() => onRetry(item.id)}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="Retry"
          >
            <RotateCcw size={14} className="text-muted-foreground hover:text-foreground" />
          </button>
        )}
        {item.status === 'downloading' && (
          <button
            onClick={() => onPause(item.id)}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="Pause"
          >
            <PauseCircle size={14} className="text-muted-foreground hover:text-foreground" />
          </button>
        )}
        {(item.status === 'completed' || item.status === 'failed') && (
          <button
            onClick={() => onDelete(item)}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="Delete download"
          >
            <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
          </button>
        )}
        {item.status !== 'completed' && item.status !== 'failed' && (
          <button
            onClick={() => onCancel(item.id)}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="Cancel"
          >
            <X size={14} className="text-muted-foreground hover:text-destructive" />
          </button>
        )}
      </div>
    </div>
  )
}
