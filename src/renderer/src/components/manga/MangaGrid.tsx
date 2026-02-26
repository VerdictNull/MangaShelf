import { motion } from 'framer-motion'
import type { MangaWithLibrary } from '@shared/types'
import { MangaCard } from './MangaCard'
import { cn } from '@renderer/lib/cn'

interface MangaGridProps {
  manga: MangaWithLibrary[]
  showStatus?: boolean
  className?: string
  emptyMessage?: string
}

export function MangaGrid({
  manga,
  showStatus = false,
  className,
  emptyMessage = 'No manga found'
}: MangaGridProps): JSX.Element {
  if (manga.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid gap-3',
        'grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]',
        className
      )}
    >
      {manga.map((m, i) => (
        <motion.div
          key={m.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut', delay: Math.min(i, 18) * 0.035 }}
        >
          <MangaCard manga={m} showStatus={showStatus} />
        </motion.div>
      ))}
    </div>
  )
}
