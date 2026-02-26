import { useState } from 'react'
import { cn } from '@renderer/lib/cn'
import { BookOpen } from 'lucide-react'

interface CoverImageProps {
  mangaId: string
  coverFilename?: string | null
  coverLocalPath?: string | null
  coverUrl?: string | null
  alt: string
  className?: string
  imgClassName?: string
  size?: 256 | 512
}

export function CoverImage({
  mangaId,
  coverFilename,
  coverLocalPath,
  coverUrl,
  alt,
  className,
  imgClassName,
  size = 256
}: CoverImageProps): JSX.Element {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  let src: string | null = null
  if (coverLocalPath && !coverLocalPath.includes('undefined')) {
    src = `file://${coverLocalPath}`
  } else if (coverUrl) {
    src = coverUrl
  } else if (coverFilename) {
    src = `https://uploads.mangadex.org/covers/${mangaId}/${coverFilename}.${size}.jpg`
  }

  if (error || !src) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted rounded',
          className
        )}
      >
        <BookOpen size={32} className="text-muted-foreground/50" />
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden rounded', className)}>
      {!loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded" />
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
          imgClassName
        )}
      />
    </div>
  )
}
