import { useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, ChevronLeft, ChevronRight, Maximize, Minimize,
  AlignLeft, AlignCenter, ChevronsDownUp, ZoomIn, List, Settings2
} from 'lucide-react'
import { useReaderStore } from '@renderer/store/readerStore'
import { getChapters } from '@renderer/lib/api'
import { formatChapterNumber } from '@renderer/lib/formatters'
import { cn } from '@renderer/lib/cn'
import { useSettingsStore } from '@renderer/store/settingsStore'

export function ReaderPage(): JSX.Element {
  const { mangaId, chapterId } = useParams<{ mangaId: string; chapterId: string }>()
  const navigate = useNavigate()
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settings = useSettingsStore((s) => s.settings)

  const {
    pages, currentPage, totalPages, mode, direction, showControls, isLoading, error,
    chapterList, currentChapterIndex,
    openChapter, setPage, nextPage, prevPage, nextChapter, prevChapter,
    setMode, cycleZoomMode, toggleControls, toggleThumbnails, showThumbnails, close,
    resetUI
  } = useReaderStore()

  const { data: chapters = [], isLoading: chaptersLoading } = useQuery({
    queryKey: ['chapters', mangaId],
    queryFn: () => getChapters(mangaId!),
    enabled: !!mangaId
  })

  // Reset UI state (controls visible) whenever the reader is opened
  useEffect(() => {
    resetUI()
  }, [mangaId, chapterId])

  // Open chapter when chapters load
  useEffect(() => {
    if (mangaId && chapterId && chapters.length > 0) {
      // Apply stored reader settings
      if (settings?.readerMode) setMode(settings.readerMode)
      openChapter(mangaId, chapterId, chapters)
    }
  }, [mangaId, chapterId, chapters.length])

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    if (!showControls) toggleControls()
    controlsTimerRef.current = setTimeout(() => {
      // only hide in single/double mode, not webtoon
      if (mode !== 'webtoon') toggleControls()
    }, 3000)
  }, [showControls, mode, toggleControls])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      resetControlsTimer()

      const isLtr = direction === 'ltr'
      switch (e.key) {
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault()
          isLtr ? nextPage() : prevPage()
          break
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault()
          isLtr ? prevPage() : nextPage()
          break
        case 'PageDown':
          e.preventDefault()
          setPage(currentPage + 5)
          break
        case 'PageUp':
          e.preventDefault()
          setPage(Math.max(0, currentPage - 5))
          break
        case 'Home':
          e.preventDefault()
          setPage(0)
          break
        case 'End':
          e.preventDefault()
          setPage(totalPages - 1)
          break
        case ']':
          e.preventDefault()
          nextChapter()
          break
        case '[':
          e.preventDefault()
          prevChapter()
          break
        case 'f':
        case 'F':
          e.preventDefault()
          document.fullscreenElement
            ? document.exitFullscreen()
            : document.documentElement.requestFullscreen()
          break
        case 'h':
        case 'H':
          e.preventDefault()
          toggleControls()
          break
        case 't':
        case 'T':
          e.preventDefault()
          toggleThumbnails()
          break
        case 'm':
        case 'M':
          e.preventDefault()
          setMode(mode === 'single' ? 'double' : mode === 'double' ? 'webtoon' : 'single')
          break
        case 'z':
        case 'Z':
          e.preventDefault()
          cycleZoomMode()
          break
        case 'Escape':
          e.preventDefault()
          close()
          navigate(`/manga/${mangaId}`)
          break
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [currentPage, totalPages, direction, mode])

  // Click to navigate
  const handleClick = (e: React.MouseEvent) => {
    resetControlsTimer()
    const x = e.clientX / window.innerWidth
    if (x < 0.3) prevPage()
    else if (x > 0.7) nextPage()
    else toggleControls()
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black gap-4 p-6">
        <p className="text-destructive text-base font-semibold">Failed to load chapter</p>
        <p className="text-destructive/60 text-sm text-center max-w-md break-all">{error}</p>
        <button
          onClick={() => navigate(`/manga/${mangaId}`)}
          className="mt-2 px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
        >
          Back to manga
        </button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col h-screen select-none',
        settings?.backgroundStyle === 'white' ? 'bg-white' :
        settings?.backgroundStyle === 'gray' ? 'bg-gray-800' : 'bg-black'
      )}
      onMouseMove={resetControlsTimer}
    >
      {/* Controls overlay */}
      <AnimatePresence>
        {(showControls || mode === 'webtoon') && (
          <>
            {/* Top bar */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3 bg-gradient-to-b from-black/80 to-transparent"
            >
              <button
                onClick={() => { close(); navigate(`/manga/${mangaId}`) }}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close reader"
              >
                <ArrowLeft size={18} className="text-white" />
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {chapterList[currentChapterIndex]
                    ? (chapterList[currentChapterIndex].title ||
                       formatChapterNumber(chapterList[currentChapterIndex].chapterNumber))
                    : '…'}
                </p>
              </div>

              {/* Mode toggle */}
              <div className="flex items-center gap-1 bg-black/40 rounded-lg p-1">
                <button
                  onClick={() => setMode('single')}
                  className={cn('p-1.5 rounded transition-colors', mode === 'single' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80')}
                  title="Single page"
                >
                  <AlignCenter size={15} />
                </button>
                <button
                  onClick={() => setMode('double')}
                  className={cn('p-1.5 rounded transition-colors', mode === 'double' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80')}
                  title="Double page"
                >
                  <AlignLeft size={15} />
                </button>
                <button
                  onClick={() => setMode('webtoon')}
                  className={cn('p-1.5 rounded transition-colors', mode === 'webtoon' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80')}
                  title="Webtoon scroll"
                >
                  <ChevronsDownUp size={15} />
                </button>
              </div>

              <button
                onClick={toggleThumbnails}
                className={cn('p-1.5 rounded-lg transition-colors', showThumbnails ? 'text-white bg-white/20' : 'text-white/60 hover:text-white hover:bg-white/10')}
                title="Thumbnails"
              >
                <List size={16} />
              </button>

              <button
                onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                title="Fullscreen (F)"
              >
                {document.fullscreenElement ? <Minimize size={16} /> : <Maximize size={16} />}
              </button>
            </motion.div>

            {/* Bottom bar - page navigation */}
            {mode !== 'webtoon' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3 bg-gradient-to-t from-black/80 to-transparent"
              >
                <button
                  onClick={prevChapter}
                  disabled={currentChapterIndex <= 0}
                  className="text-xs text-white/60 hover:text-white disabled:opacity-30 transition-colors px-2 py-1 rounded hover:bg-white/10"
                >
                  Prev Ch.
                </button>

                <button
                  onClick={prevPage}
                  disabled={currentPage <= 0}
                  className="p-1.5 rounded-lg text-white hover:bg-white/10 transition-colors disabled:opacity-30"
                >
                  <ChevronLeft size={18} />
                </button>

                {/* Page scrubber */}
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={totalPages - 1}
                    value={currentPage}
                    onChange={(e) => setPage(Number(e.target.value))}
                    className="flex-1 accent-primary h-1"
                  />
                </div>

                <button
                  onClick={nextPage}
                  disabled={currentPage >= totalPages - 1}
                  className="p-1.5 rounded-lg text-white hover:bg-white/10 transition-colors disabled:opacity-30"
                >
                  <ChevronRight size={18} />
                </button>

                <button
                  onClick={nextChapter}
                  disabled={currentChapterIndex >= chapterList.length - 1}
                  className="text-xs text-white/60 hover:text-white disabled:opacity-30 transition-colors px-2 py-1 rounded hover:bg-white/10"
                >
                  Next Ch.
                </button>

                {settings?.showPageNumbers && (
                  <span className="text-xs text-white/70 min-w-[60px] text-center">
                    {currentPage + 1} / {totalPages}
                  </span>
                )}
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* Page content — relative container; children use absolute inset-0 to fill */}
      <div className="flex-1 min-h-0 relative">
        {(chaptersLoading || isLoading) ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-white/60 text-sm">{chaptersLoading ? 'Loading chapters…' : 'Loading pages…'}</p>
          </div>
        ) : mode === 'webtoon' ? (
          <WebtoonView pages={pages} />
        ) : (
          <PageView
            pages={pages}
            currentPage={currentPage}
            mode={mode}
            onClick={handleClick}
          />
        )}
      </div>

      {/* Thumbnail strip */}
      <AnimatePresence>
        {showThumbnails && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            className="absolute bottom-5 left-0 right-0 z-40 bg-black/90 p-2"
          >
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {pages.map((page, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={cn(
                    'flex-shrink-0 rounded overflow-hidden border-2 transition-colors',
                    i === currentPage ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
                  )}
                >
                  <img src={page.url} alt={`Page ${i + 1}`} className="h-16 w-auto" loading="lazy" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent progress bar + page indicator — always visible in single/double mode */}
      {mode !== 'webtoon' && totalPages > 0 && (
        <>
          {/* Chapter + page label, bottom-left */}
          <div className="absolute bottom-1 left-3 z-30 flex items-center gap-1.5 pointer-events-none">
            <span className="text-[10px] text-white/40 font-mono tabular-nums">
              {chapterList[currentChapterIndex]
                ? (chapterList[currentChapterIndex].title ||
                   formatChapterNumber(chapterList[currentChapterIndex].chapterNumber))
                : ''}
            </span>
            {chapterList[currentChapterIndex] && <span className="text-[10px] text-white/20">·</span>}
            <span className="text-[10px] text-white/40 font-mono tabular-nums">
              {currentPage + 1} / {totalPages}
            </span>
          </div>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 z-30 h-0.5 bg-white/5">
            <div
              className="h-full bg-primary/70 transition-all duration-150"
              style={{ width: `${((currentPage + 1) / totalPages) * 100}%` }}
            />
          </div>
        </>
      )}
    </div>
  )
}

// Single / Double page view — uses absolute inset-0 so height is always defined
function PageView({
  pages,
  currentPage,
  mode,
  onClick
}: {
  pages: { url: string; loaded: boolean }[]
  currentPage: number
  mode: 'single' | 'double'
  onClick: (e: React.MouseEvent) => void
}): JSX.Element {
  const setPageLoaded = useReaderStore((s) => s.setPageLoaded)
  const animationsEnabled = useSettingsStore((s) => s.settings?.animationsEnabled ?? true)

  const leftPage = pages[currentPage]
  const rightPage = mode === 'double' ? pages[currentPage + 1] : null

  if (!leftPage) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <p className="text-white text-base font-medium">No pages found</p>
        <p className="text-white/50 text-sm">Chapter may not be available in your region or language</p>
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={currentPage}
        initial={animationsEnabled ? { opacity: 0, x: 20 } : false}
        animate={{ opacity: 1, x: 0 }}
        exit={animationsEnabled ? { opacity: 0, x: -20 } : undefined}
        transition={{ duration: 0.15 }}
        className="absolute inset-0 flex items-center justify-center gap-2 cursor-pointer"
        onClick={onClick}
      >
        {/* Loading spinner shown while first page isn't loaded yet */}
        {!leftPage.loaded && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}

        <img
          src={leftPage.url}
          alt={`Page ${currentPage + 1}`}
          onLoad={() => setPageLoaded(currentPage)}
          onError={() => setPageLoaded(currentPage)}
          className="max-h-full max-w-full object-contain"
          style={{ opacity: leftPage.loaded ? 1 : 0, transition: 'opacity 0.15s' }}
          draggable={false}
        />
        {rightPage && (
          <img
            src={rightPage.url}
            alt={`Page ${currentPage + 2}`}
            onLoad={() => setPageLoaded(currentPage + 1)}
            onError={() => setPageLoaded(currentPage + 1)}
            className="max-h-full max-w-full object-contain"
            style={{ opacity: rightPage.loaded ? 1 : 0, transition: 'opacity 0.15s' }}
            draggable={false}
          />
        )}
      </motion.div>
    </AnimatePresence>
  )
}

// Webtoon infinite scroll view
function WebtoonView({ pages }: { pages: { url: string; loaded: boolean }[] }): JSX.Element {
  const setPageLoaded = useReaderStore((s) => s.setPageLoaded)

  return (
    <div className="absolute inset-0 overflow-y-auto flex flex-col items-center">
      {pages.map((page, i) => (
        <img
          key={i}
          src={page.url}
          alt={`Page ${i + 1}`}
          onLoad={() => setPageLoaded(i)}
          className="max-w-3xl w-full"
          loading="lazy"
          draggable={false}
        />
      ))}
    </div>
  )
}
