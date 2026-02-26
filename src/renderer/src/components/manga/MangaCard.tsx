import { useNavigate } from 'react-router-dom'
import { Star, Heart } from 'lucide-react'
import { motion } from 'framer-motion'
import type { MangaWithLibrary } from '@shared/types'
import { CoverImage } from './CoverImage'
import { StatusBadge } from './StatusBadge'
import { cn } from '@renderer/lib/cn'
import { truncate } from '@renderer/lib/formatters'

interface MangaCardProps {
  manga: MangaWithLibrary
  showStatus?: boolean
  className?: string
}

export function MangaCard({ manga, showStatus = true, className }: MangaCardProps): JSX.Element {
  const navigate = useNavigate()

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={cn(
        'group relative cursor-pointer rounded-lg overflow-hidden bg-card border border-border/50',
        'hover:border-primary/40 hover:shadow-xl hover:shadow-primary/15 transition-shadow duration-300',
        className
      )}
      onClick={() => navigate(`/manga/${manga.id}`)}
      role="article"
      aria-label={manga.title}
    >
      {/* Cover */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '3/4' }}>
        <CoverImage
          mangaId={manga.id}
          coverFilename={manga.coverFilename}
          coverLocalPath={manga.coverLocalPath}
          coverUrl={manga.coverUrl}
          alt={manga.title}
          className="w-full h-full"
          imgClassName="transition-transform duration-500 group-hover:scale-110"
        />

        {/* Hover overlay with title */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2">
          <p className="text-white text-xs font-medium leading-tight line-clamp-3">
            {manga.title}
          </p>
        </div>

        {/* Favorite indicator */}
        {manga.library?.isFavorite && (
          <div className="absolute top-1.5 right-1.5 z-10">
            <Heart size={14} className="text-primary fill-primary drop-shadow-sm" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2 space-y-1">
        <p className="text-xs font-medium text-foreground leading-tight line-clamp-2">
          {truncate(manga.title, 60)}
        </p>

        <div className="flex items-center justify-between gap-1">
          {showStatus && manga.library ? (
            <StatusBadge status={manga.library.readStatus} />
          ) : (
            <span className="text-xs text-muted-foreground">{manga.status ?? 'Unknown'}</span>
          )}

          {manga.library?.userRating && (
            <div className="flex items-center gap-0.5">
              <Star size={10} className="text-warning fill-warning" />
              <span className="text-xs text-muted-foreground">{manga.library.userRating}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
