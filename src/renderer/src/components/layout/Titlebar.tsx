import { BookOpen, Menu, Search, Download } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUiStore } from '@renderer/store/uiStore'
import { useDownloadStore } from '@renderer/store/downloadStore'
import { cn } from '@renderer/lib/cn'

export function Titlebar(): JSX.Element {
  const navigate = useNavigate()
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const toggleDownloadPanel = useUiStore((s) => s.toggleDownloadPanel)
  const queue = useDownloadStore((s) => s.queue)
  const activeDownloads = queue.filter((q) => q.status === 'downloading').length

  return (
    <div
      className="titlebar-drag flex items-center h-9 px-3 bg-background/95 backdrop-blur border-b border-border/50 z-50 flex-shrink-0"
      style={{ height: 'var(--titlebar-height)' }}
    >
      {/* Left: menu toggle + branding */}
      <div className="titlebar-no-drag flex items-center gap-2">
        <button
          onClick={toggleSidebar}
          className="p-1 rounded hover:bg-accent transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={16} className="text-muted-foreground" />
        </button>

        <div
          className="flex items-center gap-1.5 cursor-pointer"
          onClick={() => navigate('/home')}
        >
          <BookOpen size={16} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">MangaShelf</span>
        </div>
      </div>

      {/* Center: drag region */}
      <div className="flex-1" />

      {/* Right: actions */}
      <div className="titlebar-no-drag flex items-center gap-1">
        <button
          onClick={() => navigate('/search')}
          className="p-1 rounded hover:bg-accent transition-colors"
          aria-label="Search"
        >
          <Search size={16} className="text-muted-foreground" />
        </button>

        <button
          onClick={toggleDownloadPanel}
          className="relative p-1 rounded hover:bg-accent transition-colors"
          aria-label="Downloads"
        >
          <Download size={16} className="text-muted-foreground" />
          {activeDownloads > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {activeDownloads}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
