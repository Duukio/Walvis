'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Hash, Volume2, Video, Plus, Settings } from 'lucide-react'
import CreateChannelModal from '@/components/modals/CreateChannelModal'
import ServerSettingsModal from '../modals/ServerSettingsModal'

type Channel = {
  id: string
  name: string
  type: 'text' | 'voice' | 'video'
}

type Server = {
  id: string
  name: string
}

export default function ChannelList() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const serverId = params?.serverId as string
  const channelId = params?.channelId as string

  const [server, setServer] = useState<Server | null>(null)
  const [textChannels, setTextChannels] = useState<Channel[]>([])
  const [voiceChannels, setVoiceChannels] = useState<Channel[]>([])
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showServerSettings, setShowServerSettings] = useState(false)

  useEffect(() => {
    if (!serverId) return
    fetchChannels()
  }, [serverId])

  const fetchChannels = async () => {
    const { data: serverData } = await supabase
      .from('servers')
      .select('id, name')
      .eq('id', serverId)
      .single()

    if (serverData) setServer(serverData)

    const { data: channels } = await supabase
      .from('channels')
      .select('id, name, type')
      .eq('server_id', serverId)
      .order('created_at', { ascending: true })

    if (channels) {
      setTextChannels(channels.filter((c) => c.type === 'text'))
      setVoiceChannels(channels.filter((c) => c.type === 'voice' || c.type === 'video'))
    }
  }

  if (!serverId) {
    return <div className="w-60 bg-gray-800 shrink-0" />
  }

return (
  <>
    <aside className="w-60 bg-gray-800 flex flex-col shrink-0">
      {/* Header del servidor */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-gray-900 shadow-sm">
        <span className="font-semibold text-white truncate">
          {server?.name ?? '...'}
        </span>
        <Settings
          size={16}
          className="text-gray-400 hover:text-white cursor-pointer shrink-0"
          onClick={() => setShowServerSettings(true)}
        />
      </div>

      {/* Canales */}
      <div className="flex-1 overflow-y-auto py-2">
        <ChannelSection
          title="Canales de texto"
          onAdd={() => setShowCreateChannel(true)}
        >
          {textChannels.map((ch) => (
            <ChannelItem
              key={ch.id}
              channel={ch}
              active={channelId === ch.id}
              onClick={() => router.push(`/servers/${serverId}/channels/${ch.id}`)}
            />
          ))}
        </ChannelSection>

        <ChannelSection
          title="Canales de voz"
          onAdd={() => setShowCreateChannel(true)}
        >
          {voiceChannels.map((ch) => (
            <ChannelItem
              key={ch.id}
              channel={ch}
              active={channelId === ch.id}
              onClick={() => router.push(`/servers/${serverId}/channels/${ch.id}`)}
            />
          ))}
        </ChannelSection>
      </div>
    </aside>

    {showServerSettings && serverId && (
      <ServerSettingsModal
        serverId={serverId}
        onClose={() => setShowServerSettings(false)}
      />
    )}

    {showCreateChannel && serverId && (
      <CreateChannelModal
        serverId={serverId}
        onClose={() => setShowCreateChannel(false)}
        onCreated={() => {
          setShowCreateChannel(false)
          fetchChannels()
        }}
      />
    )}
  </>
)

function ChannelSection({
  title,
  children,
  onAdd,
}: {
  title: string
  children: React.ReactNode
  onAdd: () => void
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between px-4 mb-1">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {title}
        </span>
        <Plus
          size={14}
          className="text-gray-400 hover:text-white cursor-pointer"
          onClick={onAdd}
        />
      </div>
      <div className="flex flex-col gap-0.5 px-2">{children}</div>
    </div>
  )
}

function ChannelItem({
  channel,
  active,
  onClick,
}: {
  channel: Channel
  active: boolean
  onClick: () => void
}) {
  const Icon =
    channel.type === 'text' ? Hash :
    channel.type === 'video' ? Video :
    Volume2

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
        active
          ? 'bg-gray-600 text-white'
          : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
      }`}
    >
      <Icon size={16} className="shrink-0" />
      <span className="truncate">{channel.name}</span>
    </button>
  )
}
}