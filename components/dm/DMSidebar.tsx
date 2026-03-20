'use client'

import { usePathname } from 'next/navigation'
import ChannelList from '@/components/sidebar/ChannelList'
import DMList from '@/components/dm/DMList'

export default function DMSidebar() {
  const pathname = usePathname()
  const isHome = pathname?.startsWith('/home')

  if (isHome) {
    return (
      <aside className="w-60 bg-gray-800 flex flex-col shrink-0 overflow-y-auto">
        <div className="h-12 px-4 flex items-center border-b border-gray-900">
          <span className="font-semibold text-white text-sm">Mensajes directos</span>
        </div>
        <DMList />
      </aside>
    )
  }

  return <ChannelList />
}