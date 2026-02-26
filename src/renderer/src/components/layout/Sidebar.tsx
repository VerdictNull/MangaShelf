import { NavLink } from 'react-router-dom'
import {
  Home,
  Library,
  Search,
  FolderOpen,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useUiStore } from '@renderer/store/uiStore'
import { cn } from '@renderer/lib/cn'
import { motion, AnimatePresence } from 'framer-motion'

const NAV_ITEMS = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/library', icon: Library, label: 'Library' },
  { to: '/search', icon: Search, label: 'Browse' },
  { to: '/collections', icon: FolderOpen, label: 'Collections' },
  { to: '/downloads', icon: Download, label: 'Downloads' }
]

export function Sidebar(): JSX.Element {
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)

  return (
    <motion.aside
      animate={{ width: collapsed ? 56 : 220 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="flex flex-col h-full bg-card border-r border-border/50 flex-shrink-0 overflow-hidden"
    >
      {/* Nav items */}
      <nav className="flex-1 p-2 space-y-0.5 mt-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className="relative block">
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-pill"
                    className="absolute inset-0 bg-primary/15 rounded-md"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span
                  className={cn(
                    'relative flex items-center gap-3 px-3 py-2 rounded-md text-sm z-10 transition-colors duration-150',
                    isActive
                      ? 'text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden whitespace-nowrap"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: settings + collapse toggle */}
      <div className="p-2 space-y-0.5 border-t border-border/50">
        <NavLink to="/settings" className="relative block">
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.div
                  layoutId="sidebar-pill"
                  className="absolute inset-0 bg-primary/15 rounded-md"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span
                className={cn(
                  'relative flex items-center gap-3 px-3 py-2 rounded-md text-sm z-10 transition-colors duration-150',
                  isActive
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Settings size={18} className="flex-shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      Settings
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
            </>
          )}
        </NavLink>

        <button
          onClick={toggleSidebar}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-150"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight size={18} className="flex-shrink-0" />
          ) : (
            <>
              <ChevronLeft size={18} className="flex-shrink-0" />
              <span className="whitespace-nowrap">Collapse</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  )
}
