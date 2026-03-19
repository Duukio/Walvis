'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Status = 'online' | 'away' | 'dnd' | 'invisible'

const STATUS_STYLES: Record<Status, string> = {
  online:    'bg-green-500',
  away:      'bg-yellow-500',
  dnd:       'bg-red-500',
  invisible: 'bg-gray-500',
}

const STATUS_PING: Record<Status, string> = {
  online:    'bg-green-400',
  away:      'bg-yellow-400',
  dnd:       'bg-red-400',
  invisible: '',
}

export default function StatusIndicator({
  userId,
  initialStatus = 'online',
  size = 'sm',
}: {
  userId: string
  initialStatus?: Status
  size?: 'sm' | 'md'
}) {
  const supabase = createClient()
  const [status, setStatus] = useState<Status>(initialStatus as Status)

  useEffect(() => {
    // Suscribirse a cambios de estado en tiempo real
    const channel = supabase
      .channel(`profile-status:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new.status) {
            setStatus(payload.new.status as Status)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const sizeClass = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
  const pingSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'

  return (
    <span className={`relative flex ${sizeClass}`}>
      {/* Ping animado solo cuando está online */}
      {status === 'online' && (
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full ${STATUS_PING[status]} opacity-60`}
        />
      )}
      <span
        className={`relative inline-flex rounded-full ${sizeClass} ${STATUS_STYLES[status]}`}
      />
    </span>
  )
}