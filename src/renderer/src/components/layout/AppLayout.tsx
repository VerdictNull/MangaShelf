import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Titlebar } from './Titlebar'
import { AnimatePresence, motion } from 'framer-motion'

export function AppLayout(): JSX.Element {
  const location = useLocation()

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <Titlebar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-hidden relative">
          <AnimatePresence initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className="absolute inset-0 overflow-y-auto"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
