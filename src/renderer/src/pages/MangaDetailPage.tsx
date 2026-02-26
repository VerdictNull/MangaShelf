import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Heart, BookOpen, Download, Star, User, Palette,
  Calendar, Check, ChevronDown, ChevronUp, Layers, Trash2
} from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getMangaDetail, getChapters, addToLibrary, updateLibraryEntry,
  removeFromLibrary, queueDownload, getProgress, deleteDownload
} from '@renderer/lib/api'
import { CoverImage } from '@renderer/components/manga/CoverImage'
import { StatusBadge } from '@renderer/components/manga/StatusBadge'
import {
  formatChapterNumber, formatRelativeTime,
  READ_STATUS_LABELS, MANGA_STATUS_LABELS
} from '@renderer/lib/formatters'
import type { ReadStatus } from '@shared/types'
import { cn } from '@renderer/lib/cn'
import { useDownloadStore } from '@renderer/store/downloadStore'

const READ_STATUS_OPTIONS: ReadStatus[] = ['reading', 'completed', 'on_hold', 'dropped', 'plan_to_read']

export function MangaDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [downloadedChapters, setDownloadedChapters] = useState<Set<string>>(new Set())
  const [deletedChapters, setDeletedChapters] = useState<Set<string>>(new Set())
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const addDownloadItem = useDownloadStore((s) => s.addItem)
  const deleteFromStore = useDownloadStore((s) => s.deleteChapter)

  const { data: manga, isLoading } = useQuery({
    queryKey: ['manga', id],
    queryFn: () => getMangaDetail(id!),
    enabled: !!id
  })

  const { data: chapters = [] } = useQuery({
    queryKey: ['chapters', id],
    queryFn: () => getChapters(id!),
    enabled: !!id
  })

  const { data: progress = [] } = useQuery({
    queryKey: ['progress', id],
    queryFn: () => getProgress(id!),
    enabled: !!id
  })

  // Build O(1) lookup and find where to continue
  const progressMap = new Map(progress.map((p) => [p.chapterId, p]))
  const lastRead = progress.reduce<typeof progress[0] | null>(
    (best, p) => (!best || p.lastReadAt > best.lastReadAt ? p : best),
    null
  )
  const continueChapterId = (() => {
    if (!lastRead) return null
    if (!lastRead.isCompleted) return lastRead.chapterId
    const idx = chapters.findIndex((c) => c.id === lastRead.chapterId)
    return idx >= 0 && idx + 1 < chapters.length ? chapters[idx + 1].id : null
  })()

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['manga', id] })
    qc.invalidateQueries({ queryKey: ['library'] })
    qc.invalidateQueries({ queryKey: ['libraryCounts'] })
    qc.invalidateQueries({ queryKey: ['progress', id] })
  }

  const addMutation = useMutation({
    mutationFn: (status: ReadStatus) => addToLibrary(id!, status),
    onSuccess: invalidateAll
  })

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<{ readStatus: ReadStatus; isFavorite: boolean; userRating: number }>) =>
      updateLibraryEntry(id!, updates as any),
    onSuccess: invalidateAll
  })

  const removeMutation = useMutation({
    mutationFn: () => removeFromLibrary(id!),
    onSuccess: invalidateAll
  })

  const handleDownloadChapter = async (chapterId: string) => {
    try {
      setDownloadError(null)
      const item = await queueDownload(chapterId)
      addDownloadItem(item)
      setDownloadedChapters((prev) => new Set([...prev, chapterId]))
    } catch (err: any) {
      setDownloadError(err.message ?? 'Failed to queue download')
      setTimeout(() => setDownloadError(null), 5000)
    }
  }

  const handleDeleteChapter = async (chapterId: string) => {
    try {
      await deleteFromStore(chapterId, id!)
      setDeletedChapters((prev) => new Set([...prev, chapterId]))
      setDownloadedChapters((prev) => { const s = new Set(prev); s.delete(chapterId); return s })
      qc.invalidateQueries({ queryKey: ['chapters', id] })
    } catch {
      // silently ignore
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="flex gap-6">
          <div className="w-40 h-56 bg-muted rounded-lg animate-pulse" />
          <div className="flex-1 space-y-3">
            <div className="h-7 w-3/4 bg-muted rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
            <div className="h-4 w-1/3 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (!manga) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Manga not found</p>
        <button onClick={() => navigate(-1)} className="text-primary text-sm hover:underline">
          Go back
        </button>
      </div>
    )
  }

  const inLibrary = !!manga.library
  const description = manga.description || 'No description available.'
  const descPreview = description.slice(0, 300)

  return (
    <div className="p-6 space-y-6 max-w-screen-lg mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Header */}
      <div className="flex gap-6">
        <CoverImage
          mangaId={manga.id}
          coverFilename={manga.coverFilename}
          coverLocalPath={manga.coverLocalPath}
          coverUrl={manga.coverUrl}
          alt={manga.title}
          size={512}
          className="w-40 h-56 flex-shrink-0 rounded-lg shadow-lg"
        />

        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <h1 className="text-xl font-bold leading-tight">{manga.title}</h1>
            {manga.titleAlt.length > 0 && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                {manga.titleAlt[0]}
              </p>
            )}
          </div>

          {/* Meta */}
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {manga.authors.length > 0 && (
              <span className="flex items-center gap-1">
                <User size={13} /> {manga.authors.join(', ')}
              </span>
            )}
            {manga.artists.length > 0 && manga.artists[0] !== manga.authors[0] && (
              <span className="flex items-center gap-1">
                <Palette size={13} /> {manga.artists.join(', ')}
              </span>
            )}
            {manga.year && (
              <span className="flex items-center gap-1">
                <Calendar size={13} /> {manga.year}
              </span>
            )}
            {manga.status && (
              <span className={cn(
                'px-2 py-0.5 rounded text-xs',
                manga.status === 'ongoing' ? 'bg-info/15 text-info' :
                manga.status === 'completed' ? 'bg-success/15 text-success' :
                manga.status === 'hiatus' ? 'bg-warning/15 text-warning' :
                'bg-destructive/15 text-destructive'
              )}>
                {MANGA_STATUS_LABELS[manga.status] ?? manga.status}
              </span>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {manga.tags.slice(0, 8).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
            {manga.tags.length > 8 && (
              <span className="px-2 py-0.5 rounded text-xs text-muted-foreground">
                +{manga.tags.length - 8}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            {/* Library status */}
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu((v) => !v)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                  inLibrary
                    ? 'bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                {inLibrary ? (
                  <>
                    <Check size={14} />
                    {READ_STATUS_LABELS[manga.library!.readStatus]}
                    <ChevronDown size={14} />
                  </>
                ) : (
                  <>
                    <BookOpen size={14} />
                    Add to Library
                  </>
                )}
              </button>

              <AnimatePresence>
                {showStatusMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute top-full mt-1 left-0 z-50 bg-popover border border-border rounded-lg shadow-xl overflow-hidden min-w-[160px]"
                  >
                    {READ_STATUS_OPTIONS.map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          if (inLibrary) updateMutation.mutate({ readStatus: status })
                          else addMutation.mutate(status)
                          setShowStatusMenu(false)
                        }}
                        className={cn(
                          'w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors',
                          manga.library?.readStatus === status && 'text-primary font-medium'
                        )}
                      >
                        {READ_STATUS_LABELS[status]}
                      </button>
                    ))}
                    {inLibrary && (
                      <>
                        <div className="border-t border-border" />
                        <button
                          onClick={() => { removeMutation.mutate(); setShowStatusMenu(false) }}
                          className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors"
                        >
                          Remove from Library
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Favorite */}
            {inLibrary && (
              <button
                onClick={() => updateMutation.mutate({ isFavorite: !manga.library!.isFavorite })}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border',
                  manga.library?.isFavorite
                    ? 'bg-primary/15 border-primary/30 text-primary'
                    : 'bg-card border-border text-muted-foreground hover:bg-accent'
                )}
              >
                <Heart size={14} className={manga.library?.isFavorite ? 'fill-primary' : ''} />
                {manga.library?.isFavorite ? 'Favorited' : 'Favorite'}
              </button>
            )}

            {/* Read / Continue button */}
            {chapters.length > 0 && (
              <button
                onClick={() => navigate(`/reader/${manga.id}/${continueChapterId ?? chapters[0].id}`)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 transition-colors"
              >
                <BookOpen size={14} />
                {continueChapterId
                  ? `Continue ${formatChapterNumber(chapters.find((c) => c.id === continueChapterId)?.chapterNumber)}`
                  : 'Read First'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <h2 className="text-sm font-semibold mb-2">Synopsis</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {showFullDescription || description.length <= 300 ? description : descPreview + '...'}
        </p>
        {description.length > 300 && (
          <button
            onClick={() => setShowFullDescription((v) => !v)}
            className="flex items-center gap-1 text-xs text-primary mt-1 hover:underline"
          >
            {showFullDescription ? (
              <><ChevronUp size={12} /> Show less</>
            ) : (
              <><ChevronDown size={12} /> Read more</>
            )}
          </button>
        )}
      </div>

      {/* Chapters */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Layers size={16} className="text-primary" />
          <h2 className="text-sm font-semibold">
            {chapters.length} Chapter{chapters.length !== 1 ? 's' : ''}
          </h2>
        </div>

        {downloadError && (
          <div className="mb-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            {downloadError}
          </div>
        )}

        <div className="space-y-0.5 pr-1">
          {chapters.map((ch) => {
            const prog = progressMap.get(ch.id)
            const isCompleted = prog?.isCompleted ?? false
            const isInProgress = !!prog && !isCompleted
            const isCurrent = ch.id === continueChapterId && !isCompleted
            const pct = prog && prog.totalPages
              ? Math.round((prog.currentPage / prog.totalPages) * 100)
              : 0
            return (
              <div
                key={ch.id}
                className={cn(
                  'relative flex items-center gap-3 px-2.5 pt-2 pb-1.5 rounded-lg hover:bg-accent group transition-colors',
                  isCompleted && 'opacity-50',
                  isCurrent && 'bg-primary/5 border border-primary/15'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-sm font-medium', isCompleted && 'line-through decoration-muted-foreground/40')}>
                      {formatChapterNumber(ch.chapterNumber)}
                    </span>
                    {ch.title && (
                      <span className="text-sm text-muted-foreground truncate">– {ch.title}</span>
                    )}
                    {isCompleted && (
                      <span className="text-xs text-success/70 flex items-center gap-0.5">
                        <Check size={11} /> Read
                      </span>
                    )}
                    {isInProgress && (
                      <span className="text-xs text-primary/80">
                        pg {prog!.currentPage + 1}/{prog!.totalPages ?? '?'}
                      </span>
                    )}
                    {ch.isDownloaded && !isCompleted && !deletedChapters.has(ch.id) && (
                      <span className="text-xs text-success/60">↓</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {ch.publishedAt && (
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(ch.publishedAt)}
                      </p>
                    )}
                  </div>
                  {/* Per-chapter progress bar */}
                  {isInProgress && prog!.totalPages && (
                    <div className="mt-1.5 h-0.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-primary/60 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => navigate(`/reader/${manga.id}/${ch.id}`)}
                    className="px-2.5 py-1 text-xs rounded bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                  >
                    {isInProgress ? 'Resume' : isCompleted ? 'Re-read' : 'Read'}
                  </button>
                  {(ch.isDownloaded && !deletedChapters.has(ch.id)) && (
                    <button
                      onClick={() => handleDeleteChapter(ch.id)}
                      className="p-1 rounded hover:bg-accent transition-colors"
                      title="Delete download"
                    >
                      <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
                    </button>
                  )}
                  {!ch.isDownloaded && !downloadedChapters.has(ch.id) && !deletedChapters.has(ch.id) && (
                    <button
                      onClick={() => handleDownloadChapter(ch.id)}
                      className="p-1 rounded hover:bg-accent transition-colors"
                      title="Download chapter"
                    >
                      <Download size={14} className="text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
