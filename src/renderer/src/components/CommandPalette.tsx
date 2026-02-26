import { useEffect, useCallback } from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import { useUiStore } from '@renderer/store/uiStore'
import { Search, BookOpen, Library, Download, Settings, Star, FolderOpen, Home } from 'lucide-react'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ElementType
  action: () => void
}

export function CommandPalette(): JSX.Element | null {
  const open = useUiStore((s) => s.commandPaletteOpen)
  const close = useUiStore((s) => s.closeCommandPalette)
  const navigate = useNavigate()

  const go = useCallback(
    (path: string) => {
      navigate(path)
      close()
    },
    [navigate, close]
  )

  const items: CommandItem[] = [
    { id: 'home', label: 'Go to Home', icon: Home, action: () => go('/home') },
    { id: 'library', label: 'Go to Library', icon: Library, action: () => go('/library') },
    { id: 'search', label: 'Browse & Search', description: 'Search MangaDex', icon: Search, action: () => go('/search') },
    { id: 'collections', label: 'Go to Collections', icon: Star, action: () => go('/collections') },
    { id: 'downloads', label: 'Go to Downloads', icon: Download, action: () => go('/downloads') },
    { id: 'settings', label: 'Open Settings', icon: Settings, action: () => go('/settings') },
    { id: 'import', label: 'Import Local Files', description: 'Import CBZ/CBR/ZIP files', icon: FolderOpen, action: async () => { close(); navigate('/library') } },
    { id: 'reader', label: 'Open Library to Read', icon: BookOpen, action: () => go('/library') }
  ]

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      onClick={close}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-xl mx-4 bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="[&_[cmdk-input-wrapper]]:border-b [&_[cmdk-input-wrapper]]:border-border">
          <div className="flex items-center gap-2 px-4 py-3">
            <Search size={16} className="text-muted-foreground flex-shrink-0" />
            <Command.Input
              autoFocus
              placeholder="Search commands and navigate..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="text-xs px-1.5 py-0.5 bg-muted rounded border border-border text-muted-foreground font-mono">
              Esc
            </kbd>
          </div>

          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found
            </Command.Empty>

            <Command.Group heading="Navigation" className="[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-medium">
              {items.map((item) => (
                <Command.Item
                  key={item.id}
                  value={item.label}
                  onSelect={item.action}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                >
                  <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                    <item.icon size={14} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div>{item.label}</div>
                    {item.description && (
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                    )}
                  </div>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  )
}

export function useCommandPaletteShortcut(): void {
  const open = useUiStore((s) => s.openCommandPalette)
  const isOpen = useUiStore((s) => s.commandPaletteOpen)
  const close = useUiStore((s) => s.closeCommandPalette)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) close()
        else open()
      }
      if (e.key === 'Escape' && isOpen) {
        close()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, open, close])
}
