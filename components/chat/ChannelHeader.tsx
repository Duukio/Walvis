'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Hash, Volume2, Video, Users } from 'lucide-react'

type Channel = {
  name: string
  type: 'text' | 'voice' | 'video'
  server_id: string
}

export default function ChannelHeader({
  channelId,
  showMembers,
  onToggleMembers,
}: {
  channelId: string
  showMembers: boolean
  onToggleMembers: () => void
}) {
  const supabase = createClient()
  const [channel, setChannel] = useState<Channel | null>(null)
  const [memberCount, setMemberCount] = useState(0)

  useEffect(() => {
    const fetchChannel = async () => {
      const { data } = await supabase
        .from('channels')
        .select('name, type, server_id')
        .eq('id', channelId)
        .single()

      if (data) {
        setChannel(data)
        const { count } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('server_id', data.server_id)
        setMemberCount(count ?? 0)
      }
    }
    fetchChannel()
  }, [channelId])

  const Icon =
    channel?.type === 'text' ? Hash :
    channel?.type === 'video' ? Video :
    Volume2

  return (
    <div className="h-12 px-4 flex items-center justify-between border-b border-gray-900 bg-gray-700 shadow-sm shrink-0">
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-gray-400 shrink-0" />
        <span className="text-white font-semibold text-sm">
          {channel?.name ?? '...'}
        </span>
      </div>

      <button
        onClick={onToggleMembers}
        className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-colors ${
          showMembers
            ? 'bg-gray-600 text-white'
            : 'text-gray-400 hover:text-white hover:bg-gray-600'
        }`}
        title="Mostrar miembros"
      >
        <Users size={14} />
        <span>{memberCount}</span>
      </button>
    </div>
  )
}