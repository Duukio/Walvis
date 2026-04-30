'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import ServerList from '@/components/sidebar/ServerList'
import DMSidebar from '@/components/dm/DMSidebar'
import MobileUserPanel from '@/components/mobile/MobileUserPanel'

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-gray-800">
      {/* Header */}
      <div className="h-12 bg-gray-900 flex items-center px-4 gap-3 shrink-0 border-b border-gray-700">
        <button
          onClick={() => setDrawerOpen(true)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <Menu size={22} />
        </button>
        <span className="text-white font-semibold text-sm flex-1 truncate">Walvis</span>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>

      {/* Barra inferior con UserPanel expandible */}
      <MobileUserPanel />

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setDrawerOpen(false)} />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 flex transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="w-[72px] bg-gray-900 flex flex-col items-center py-3 gap-2 overflow-y-auto">
          <ServerList />
        </div>
        <div className="w-60 bg-gray-800 flex flex-col overflow-y-auto">
          <div className="h-12 px-4 flex items-center justify-between border-b border-gray-900">
            <span className="text-white font-semibold text-sm">Menú</span>
            <button onClick={() => setDrawerOpen(false)} className="text-gray-400 hover:text-white">
              <X size={18} />
            </button>
          </div>
          <DMSidebar />
        </div>
      </div>
    </div>
  )
}