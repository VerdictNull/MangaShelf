import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal, X, Shuffle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { searchManga, getTags, getRandomManga } from '@renderer/lib/api'
import { MangaGrid } from '@renderer/components/manga/MangaGrid'
import type { MangaDexTag, MangaWithLibrary, MangaStatus, SearchParams } from '@shared/types'
import { cn } from '@renderer/lib/cn'

const SORT_OPTIONS = [
  { value: 'followedCount', label: 'Most Followed' },
  { value: 'latestUploadedChapter', label: 'Latest Upload' },
  { value: 'createdAt', label: 'Newest' },
  { value: 'title', label: 'Title A-Z' },
  { value: 'rating', label: 'Rating' }
] as const

const STATUS_OPTIONS: { value: MangaStatus; label: string }[] = [
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'hiatus', label: 'Hiatus' },
  { value: 'cancelled', label: 'Cancelled' }
]

const DEMOGRAPHIC_OPTIONS = [
  { value: 'shounen', label: 'Shounen' },
  { value: 'shoujo', label: 'Shoujo' },
  { value: 'seinen', label: 'Seinen' },
  { value: 'josei', label: 'Josei' }
]

export function SearchPage(): JSX.Element {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<MangaStatus[]>([])
  const [selectedDemographics, setSelectedDemographics] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>('followedCount')
  const [offset, setOffset] = useState(0)
  const LIMIT = 24

  const searchParams: SearchParams = {
    query: query || undefined,
    tags: selectedTags.length ? selectedTags : undefined,
    status: selectedStatuses.length ? selectedStatuses : undefined,
    demographic: selectedDemographics.length ? (selectedDemographics as any) : undefined,
    sortBy: sortBy as any,
    offset,
    limit: LIMIT
  }

  const { data, isFetching } = useQuery({
    queryKey: ['search', searchParams],
    queryFn: () => searchManga(searchParams),
    placeholderData: (prev) => prev,
    staleTime: 2 * 60 * 1000
  })

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: getTags,
    staleTime: Infinity
  })

  const genreTags = tags.filter((t: MangaDexTag) => t.group === 'genre')

  const handleRandom = async () => {
    const manga = await getRandomManga()
    if (manga) navigate(`/manga/${manga.id}`)
  }

  const toggleTag = (id: string) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
    setOffset(0)
  }

  const toggleStatus = (s: MangaStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
    setOffset(0)
  }

  const toggleDemographic = (d: string) => {
    setSelectedDemographics((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    )
    setOffset(0)
  }

  const clearFilters = () => {
    setSelectedTags([])
    setSelectedStatuses([])
    setSelectedDemographics([])
    setOffset(0)
  }

  const hasFilters = selectedTags.length > 0 || selectedStatuses.length > 0 || selectedDemographics.length > 0

  return (
    <div className="p-6 space-y-4 max-w-screen-xl mx-auto">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            placeholder="Search manga by title..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOffset(0) }}
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            autoFocus
          />
        </div>

        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors',
            showFilters || hasFilters
              ? 'bg-primary/15 border-primary/50 text-primary'
              : 'bg-card border-border text-muted-foreground hover:bg-accent'
          )}
        >
          <SlidersHorizontal size={15} />
          {hasFilters && <span className="text-xs">({selectedTags.length + selectedStatuses.length + selectedDemographics.length})</span>}
        </button>

        <button
          onClick={handleRandom}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-card border border-border text-muted-foreground hover:bg-accent transition-colors"
          title="Random manga"
        >
          <Shuffle size={15} />
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-card border border-border/50 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Filters</h3>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={12} /> Clear all
              </button>
            )}
          </div>

          {/* Sort */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Sort by</p>
            <div className="flex flex-wrap gap-1.5">
              {SORT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setSortBy(o.value)}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs transition-colors',
                    sortBy === o.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => toggleStatus(o.value)}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs transition-colors',
                    selectedStatuses.includes(o.value)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Demographics */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Demographic</p>
            <div className="flex flex-wrap gap-1.5">
              {DEMOGRAPHIC_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => toggleDemographic(o.value)}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs transition-colors',
                    selectedDemographics.includes(o.value)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Genres */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Genres</p>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {genreTags.map((tag: MangaDexTag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs transition-colors',
                    selectedTags.includes(tag.id)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
                  )}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div>
        {data && (
          <p className="text-xs text-muted-foreground mb-3">
            {data.total.toLocaleString()} results
            {isFetching && ' · Loading...'}
          </p>
        )}

        {isFetching && !data ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="bg-muted rounded-lg animate-pulse" style={{ aspectRatio: '3/4' }} />
            ))}
          </div>
        ) : (
          <MangaGrid
            manga={(data?.manga ?? []) as MangaWithLibrary[]}
            emptyMessage="No manga found. Try different search terms or filters."
          />
        )}

        {/* Pagination */}
        {data && data.total > LIMIT && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
              className="px-4 py-2 text-sm rounded-lg bg-card border border-border disabled:opacity-40 hover:bg-accent transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {Math.floor(offset / LIMIT) + 1} / {Math.ceil(data.total / LIMIT)}
            </span>
            <button
              disabled={offset + LIMIT >= data.total}
              onClick={() => setOffset((o) => o + LIMIT)}
              className="px-4 py-2 text-sm rounded-lg bg-card border border-border disabled:opacity-40 hover:bg-accent transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
