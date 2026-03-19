'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useNotifications } from './NotificationProvider'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const TYPE_ICONS: Record<string, string> = {
  mention: '💬',
  message: '📨',
  member_join: '👋',
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [showPanel, setShowPanel] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id)
    if (notification.channel_id && notification.server_id) {
      router.push(`/servers/${notification.server_id}/channels/${notification.channel_id}`)
    }
    setShowPanel(false)
  }

  return (
    <div className="relative w-full" ref={panelRef}>
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors relative"
      >
        <div className="relative">
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        Notificaciones
      </button>

      {showPanel && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-900 rounded-lg shadow-xl border border-gray-700 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
            <span className="text-white text-sm font-semibold">Notificaciones</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Marcar todo como leído
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-400 text-sm">
                No tenés notificaciones
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-800 transition-colors border-b border-gray-800 ${
                    !n.read ? 'bg-indigo-500/5' : ''
                  }`}
                >
                  <span className="text-lg shrink-0">{TYPE_ICONS[n.type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white text-xs font-medium truncate">{n.title}</p>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-gray-400 text-xs truncate">{n.body}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}