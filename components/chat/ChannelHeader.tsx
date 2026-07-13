'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Hash, Volume2, Video, Users, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Channel = {
  name: string
  type: 'text' | 'voice' | 'video'
  server_id: string
  description: string | null
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
  const router = useRouter()
  const [channel, setChannel] = useState<Channel | null>(null)
  const [memberCount, setMemberCount] = useState(0)
  const [canDeleteChannel, setCanDeleteChannel] = useState(false)

  useEffect(() => {
    const fetchChannelAndPermissions = async () => {
      // 1. Traer datos del canal incluyendo la descripción
      const { data } = await supabase
        .from('channels')
        .select('name, type, server_id, description')
        .eq('id', channelId)
        .single()

      if (data) {
        setChannel(data)
        
        // 2. Contador de miembros
        const { count } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('server_id', data.server_id)
        setMemberCount(count ?? 0)

        // 3. Comprobar permisos del usuario actual en el servidor
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: server } = await supabase
            .from('servers')
            .select('owner_id')
            .eq('id', data.server_id)
            .single()

          const { data: member } = await supabase
            .from('members')
            .select('role')
            .eq('server_id', data.server_id)
            .eq('user_id', user.id)
            .single()

          const isOwner = server?.owner_id === user.id
          const isStaff = member?.role && ['admin', 'moderator'].includes(member.role)
          
          if (isOwner || isStaff) {
            setCanDeleteChannel(true)
          }
        }
      }
    }
    fetchChannelAndPermissions()
  }, [channelId])

  const handleDeleteChannel = async () => {
    if (!channel || !confirm('¿Estás seguro de que querés eliminar este canal? Esta acción no se puede deshacer.')) return

    const { error } = await supabase
      .from('channels')
      .delete()
      .eq('id', channelId)

    if (!error) {
      router.push(`/servers/${channel.server_id}`)
      router.refresh()
    }
  }

  const Icon =
    channel?.type === 'text' ? Hash :
    channel?.type === 'video' ? Video :
    Volume2

  return (
    <div className="h-12 px-4 flex items-center justify-between border-b border-gray-900 bg-gray-700 shadow-sm shrink-0 z-10">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Icon size={18} className="text-gray-400 shrink-0" />
        <span className="text-white font-semibold text-sm truncate shrink-0">
          {channel?.name ?? '...'}
        </span>
        {channel?.description && (
          <>
            <div className="w-px h-4 bg-gray-600 mx-2 shrink-0" />
            <span className="text-xs text-gray-400 truncate max-w-400px">
              {channel.description}
            </span>
          </>
        )}
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