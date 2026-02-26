import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FolderOpen, Trash2, ChevronRight, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  getCollections, createCollection, deleteCollection,
  getLibrary
} from '@renderer/lib/api'
import { MangaGrid } from '@renderer/components/manga/MangaGrid'
import { cn } from '@renderer/lib/cn'
import type { Collection } from '@shared/types'

export function CollectionsPage(): JSX.Element {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [newName, setNewName] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const { data: collections = [] } = useQuery({
    queryKey: ['collections'],
    queryFn: getCollections
  })

  const { data: collectionManga = [] } = useQuery({
    queryKey: ['library', { collectionId: selectedCollection?.id }],
    queryFn: () => getLibrary({ collectionId: selectedCollection!.id }),
    enabled: !!selectedCollection
  })

  const createMutation = useMutation({
    mutationFn: (name: string) => createCollection(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] })
      setNewName('')
      setShowCreate(false)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCollection(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] })
      if (selectedCollection) setSelectedCollection(null)
    }
  })

  return (
    <div className="flex h-full">
      {/* Collections list */}
      <div className="w-64 border-r border-border/50 flex flex-col flex-shrink-0">
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h2 className="text-sm font-semibold">Collections</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="p-1 rounded hover:bg-accent transition-colors"
            title="New collection"
          >
            <Plus size={16} className="text-muted-foreground" />
          </button>
        </div>

        {showCreate && (
          <div className="p-3 border-b border-border/50 bg-card/50">
            <input
              type="text"
              placeholder="Collection name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim()) {
                  createMutation.mutate(newName.trim())
                }
                if (e.key === 'Escape') {
                  setShowCreate(false)
                  setNewName('')
                }
              }}
              autoFocus
              className="w-full px-2.5 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <div className="flex gap-1.5 mt-2">
              <button
                disabled={!newName.trim()}
                onClick={() => newName.trim() && createMutation.mutate(newName.trim())}
                className="flex-1 py-1 text-xs rounded bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => { setShowCreate(false); setNewName('') }}
                className="px-2 py-1 text-xs rounded border border-border hover:bg-accent transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {collections.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center p-6">
              Create your first collection
            </p>
          ) : (
            collections.map((col) => (
              <button
                key={col.id}
                onClick={() => setSelectedCollection(col)}
                className={cn(
                  'w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-accent transition-colors group',
                  selectedCollection?.id === col.id && 'bg-primary/10 text-primary'
                )}
              >
                <FolderOpen size={15} className="flex-shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{col.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(col.id) }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-destructive transition-all"
                  title="Delete collection"
                >
                  <Trash2 size={12} />
                </button>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Collection content */}
      <div className="flex-1 overflow-y-auto p-6">
        {selectedCollection ? (
          <>
            <div className="flex items-center gap-2 mb-6">
              <FolderOpen size={20} className="text-primary" />
              <h1 className="text-lg font-semibold">{selectedCollection.name}</h1>
              <span className="text-sm text-muted-foreground">
                · {collectionManga.length} manga
              </span>
            </div>
            <MangaGrid
              manga={collectionManga}
              emptyMessage="This collection is empty. Add manga from their detail pages."
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <FolderOpen size={40} className="text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">
              Select a collection to view its manga
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
