'use client'

import { use, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ChatMessages from '@/components/chat/ChatMessages'
import MessageInput from '@/components/chat/MessageInput'
import ChannelHeader from '@/components/chat/ChannelHeader'
import MemberList from '@/components/chat/MemberList'
import VoiceChannel from '@/components/voice/VoiceChannel'

type Props = {
  params: Promise<{ serverId: string; channelId: string }>
}

export default function ChannelPage({ params }: Props) {
  const { serverId, channelId } = use(params)
  const supabase = createClient()
  const [channel, setChannel] = useState<{ name: string; type: string } | null>(null)
  const [chatBgUrl, setChatBgUrl] = useState<string | null>(null)
  const [showMembers, setShowMembers] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data: channelData } = await supabase
        .from('channels')
        .select('name, type')
        .eq('id', channelId)
        .single()

      if (channelData) setChannel(channelData)

      const { data: serverData } = await supabase
        .from('servers')
        .select('chat_bg_url')
        .eq('id', serverId)
        .single()

      if (serverData?.chat_bg_url) setChatBgUrl(serverData.chat_bg_url)
    }

    fetchData()

    // Escuchar cambios del fondo en tiempo real
    const channel = supabase
      .channel(`server-bg:${serverId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'servers', filter: `id=eq.${serverId}` },
        (payload) => {
          setChatBgUrl(payload.new.chat_bg_url ?? null)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [channelId, serverId])

  if (!channel) return null

  if (channel.type === 'voice' || channel.type === 'video') {
    return (
      <VoiceChannel
        channelId={channelId}
        channelName={channel.name}
        isVideo={channel.type === 'video'}
      />
    )
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div
        className="flex flex-col flex-1 overflow-hidden relative"
        style={chatBgUrl ? {
          backgroundImage: `url(${chatBgUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : {}}
      >
        {/* Overlay semitransparente para que los mensajes se lean bien */}
        {chatBgUrl && (
          <div className="absolute inset-0 bg-gray-900/60 pointer-events-none" />
        )}
        <div className="relative z-10 flex flex-col flex-1 overflow-hidden">
          <ChannelHeader
            channelId={channelId}
            showMembers={showMembers}
            onToggleMembers={() => setShowMembers(!showMembers)}
          />
          <ChatMessages channelId={channelId} serverId={serverId} />
          <MessageInput channelId={channelId} replyTo={null} onCancelReply={() => {}} />
        </div>
      </div>

      {showMembers && <MemberList serverId={serverId} />}
    </div>
  )
}