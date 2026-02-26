import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Play, TrendingUp, Clock, BookOpen, CheckCircle2, Heart, Sparkles, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { getContinueReading, searchManga, getLibraryCounts, getLibrary } from '@renderer/lib/api'
import { MangaGrid } from '@renderer/components/manga/MangaGrid'
import { MangaCard } from '@renderer/components/manga/MangaCard'
import { CoverImage } from '@renderer/components/manga/CoverImage'
import { formatChapterNumber, formatRelativeTime } from '@renderer/lib/formatters'
import type { ContinueReadingEntry, MangaWithLibrary } from '@shared/types'

const STAT_PILLS = [
  { key: 'reading',      label: 'Reading',      icon: BookOpen,     color: 'text-primary' },
  { key: 'completed',    label: 'Completed',    icon: CheckCircle2, color: 'text-success' },
  { key: 'plan_to_read', label: 'Plan to Read', icon: Clock,        color: 'text-muted-foreground' },
  { key: 'favorites',    label: 'Favorites',    icon: Heart,        color: 'text-primary' }
] as const

export function HomePage(): JSX.Element {
  const navigate = useNavigate()

  const { data: continueReading = [] } = useQuery({
    queryKey: ['continueReading'],
    queryFn: getContinueReading
  })

  const { data: rawCounts = {} } = useQuery({
    queryKey: ['libraryCounts'],
    queryFn: getLibraryCounts,
    staleTime: 30_000
  })
  const counts = rawCounts as Record<string, number>

  const { data: recentlyAdded = [] } = useQuery({
    queryKey: ['recentlyAdded'],
    queryFn: () => getLibrary({ sortBy: 'dateAdded', sortOrder: 'desc', limit: 12 }),
    staleTime: 60_000
  })

  const { data: popular } = useQuery({
    queryKey: ['popular'],
    queryFn: () => searchManga({ sortBy: 'followedCount', limit: 18 } as any)
  })

  return (
    <div className="p-6 space-y-8 max-w-screen-xl mx-auto">
      {/* Library Stats Strip */}
      {(counts.all ?? 0) > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-wrap gap-2"
        >
          {STAT_PILLS.map(({ key, label, icon: Icon, color }) => {
            const count = counts[key] ?? 0
            if (count === 0) return null
            return (
              <button
                key={key}
                onClick={() => navigate('/library')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border/50 hover:border-border hover:bg-accent transition-colors text-sm"
              >
                <Icon size={13} className={color} />
                <span className="font-medium text-foreground">{count}</span>
                <span className="text-muted-foreground">{label}</span>
              </button>
            )
          })}
        </motion.div>
      )}

      {/* Continue Reading */}
      {continueReading.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-primary" />
            <h2 className="text-base font-semibold">Continue Reading</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {continueReading.slice(0, 8).map((entry) => (
              <ContinueReadingCard key={entry.chapter.id} entry={entry} />
            ))}
          </div>
        </section>
      )}

      {/* Recently Added */}
      {recentlyAdded.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-primary" />
              <h2 className="text-base font-semibold">Recently Added</h2>
            </div>
            <button
              onClick={() => navigate('/library')}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View all <ArrowRight size={12} />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {recentlyAdded.map((manga) => (
              <div key={manga.id} className="w-36 flex-shrink-0">
                <MangaCard manga={manga} showStatus={false} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Popular on MangaDex */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-primary" />
          <h2 className="text-base font-semibold">Popular on MangaDex</h2>
        </div>

        {popular ? (
          <MangaGrid manga={popular.manga as MangaWithLibrary[]} />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="bg-muted rounded-lg animate-pulse"
                style={{ aspectRatio: '3/4' }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ContinueReadingCard({ entry }: { entry: ContinueReadingEntry }): JSX.Element {
  const navigate = useNavigate()
  const { manga, chapter, progress } = entry
  const pct =
    progress.totalPages && progress.totalPages > 0
      ? Math.round((progress.currentPage / progress.totalPages) * 100)
      : 0

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="flex gap-3 p-3 bg-card rounded-lg border border-border/50 cursor-pointer hover:border-primary/30 transition-colors"
      onClick={() => navigate(`/reader/${manga.id}/${chapter.id}`)}
    >
      <CoverImage
        mangaId={manga.id}
        coverFilename={manga.coverFilename}
        coverLocalPath={manga.coverLocalPath}
        coverUrl={manga.coverUrl}
        alt={manga.title}
        className="w-12 h-16 flex-shrink-0 rounded"
      />

      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-medium truncate">{manga.title}</p>
        <p className="text-xs text-muted-foreground">
          {formatChapterNumber(chapter.chapterNumber)}
        </p>
        <p className="text-xs text-muted-foreground">
          Page {progress.currentPage + 1}
          {progress.totalPages ? ` / ${progress.totalPages}` : ''}
        </p>

        {/* Progress bar */}
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
        </div>

        <p className="text-xs text-muted-foreground/70">
          {formatRelativeTime(progress.lastReadAt)}
        </p>
      </div>

      <div className="flex items-center">
        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
          <Play size={14} className="text-primary ml-0.5" />
        </div>
      </div>
    </motion.div>
  )
}
