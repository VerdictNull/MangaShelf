import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Heart, BookOpen, CheckCircle, PauseCircle, XCircle, Clock, List, Upload, HardDrive, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { getLibrary, getLibraryCounts, openFileDialog, importFiles, getOrphanedDownloads } from '@renderer/lib/api'
import { MangaGrid } from '@renderer/components/manga/MangaGrid'
import { cn } from '@renderer/lib/cn'
import type { LibraryFilters, ReadStatus } from '@shared/types'

type Tab = ReadStatus | 'all' | 'favorites'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'All', icon: List },
  { id: 'reading', label: 'Reading', icon: BookOpen },
  { id: 'completed', label: 'Completed', icon: CheckCircle },
  { id: 'on_hold', label: 'On Hold', icon: PauseCircle },
  { id: 'dropped', label: 'Dropped', icon: XCircle },
  { id: 'plan_to_read', label: 'Plan to Read', icon: Clock },
  { id: 'favorites', label: 'Favorites', icon: Heart }
]

const SORT_OPTIONS = [
  { value: 'lastRead', label: 'Last Read' },
  { value: 'title', label: 'Title' },
  { value: 'dateAdded', label: 'Date Added' },
  { value: 'rating', label: 'Rating' }
]

export function LibraryPage(): JSX.Element {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [sortBy, setSortBy] = useState<LibraryFilters['sortBy']>('lastRead')
  const [query, setQuery] = useState('')
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [showOrphaned, setShowOrphaned] = useState(true)

  async function handleImport(): Promise<void> {
    const paths = await openFileDialog()
    if (!paths.length) return
    setImporting(true)
    setImportMsg(null)
    try {
      const results = await importFiles(paths)
      const ok = results.filter((r) => r.success).length
      const fail = results.filter((r) => !r.success).length
      setImportMsg(fail === 0
        ? `Imported ${ok} file${ok !== 1 ? 's' : ''} successfully`
        : `${ok} imported, ${fail} failed`)
      qc.invalidateQueries({ queryKey: ['library'] })
      qc.invalidateQueries({ queryKey: ['libraryCounts'] })
    } finally {
      setImporting(false)
      setTimeout(() => setImportMsg(null), 4000)
    }
  }

  const filters: LibraryFilters = {
    status: activeTab,
    sortBy,
    sortOrder: 'desc',
    query: query || undefined
  }

  const { data: manga = [], isFetching } = useQuery({
    queryKey: ['library', filters],
    queryFn: () => getLibrary(filters)
  })

  const { data: counts = {} } = useQuery({
    queryKey: ['libraryCounts'],
    queryFn: getLibraryCounts
  })

  const { data: orphaned = [] } = useQuery({
    queryKey: ['orphanedDownloads'],
    queryFn: getOrphanedDownloads
  })


  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-0 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">My Library</h1>

          <div className="flex items-center gap-2">
            {importMsg && (
              <span className="text-xs text-muted-foreground animate-fade-in">{importMsg}</span>
            )}

            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors disabled:opacity-50"
            >
              <Upload size={14} />
              {importing ? 'Importing...' : 'Import'}
            </button>

            <input
              type="search"
              placeholder="Search library..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-48 px-3 py-1.5 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {TABS.map(({ id, label, icon: Icon }) => {
            const count = counts[id] ?? 0
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors flex-shrink-0',
                  activeTab === id
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon size={14} />
                {label}
                {count > 0 && (
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded-full',
                    activeTab === id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {isFetching && manga.length === 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-muted rounded-lg animate-pulse" style={{ aspectRatio: '3/4' }} />
            ))}
          </div>
        ) : manga.length === 0 && activeTab === 'all' ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <BookOpen size={48} className="text-muted-foreground/25" />
            <div className="text-center space-y-1">
              <p className="text-muted-foreground text-sm">Your library is empty</p>
              <p className="text-muted-foreground/60 text-xs">Search for manga and add them to your library</p>
            </div>
            <button
              onClick={() => navigate('/search')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
            >
              <Search size={14} />
              Browse Manga
            </button>
          </div>
        ) : (
          <MangaGrid
            manga={manga}
            showStatus={activeTab === 'all' || activeTab === 'favorites'}
            emptyMessage={`No manga with "${TABS.find(t => t.id === activeTab)?.label}" status`}
          />
        )}

        {orphaned.length > 0 && (
          <div className="border-t border-border/50 pt-6">
            <button
              onClick={() => setShowOrphaned((v) => !v)}
              className="flex items-center gap-2 mb-4 group"
            >
              <HardDrive size={15} className="text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                Cached Downloads
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                {orphaned.length}
              </span>
              {showOrphaned
                ? <ChevronUp size={14} className="text-muted-foreground" />
                : <ChevronDown size={14} className="text-muted-foreground" />
              }
            </button>
            {showOrphaned && (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  These manga have downloaded chapters but aren't in your library. Open them to manage or delete the downloads.
                </p>
                <MangaGrid manga={orphaned} showStatus={false} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
