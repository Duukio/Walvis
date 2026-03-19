'use client'

import { use, useState } from 'react'
import ChatMessages from '@/components/chat/ChatMessages'
import MessageInput from '@/components/chat/MessageInput'
import ChannelHeader from '@/components/chat/ChannelHeader'
import MemberList from '@/components/chat/MemberList'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'

type Props = {
  params: Promise<{ serverId: string; channelId: string }>
}

export default function ChannelPage({ params }: Props) {
  const { serverId, channelId } = use(params)
  const supabase = createClient()
  const [channel, setChannel] = useState<{ name: string; type: string } | null>(null)
  const [showMembers, setShowMembers] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('channels')
        .select('name, type')
        .eq('id', channelId)
        .single()
      if (data) setChannel(data)
    }
    fetch()
  }, [channelId])

  if (!channel) return null

  if (channel.type === 'voice' || channel.type === 'video') {
    const VoiceChannel = require('@/components/voice/VoiceChannel').default
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
      <div className="flex flex-col flex-1 overflow-hidden">
        <ChannelHeader
          channelId={channelId}
          showMembers={showMembers}
          onToggleMembers={() => setShowMembers(!showMembers)}
        />
        <ChatMessages channelId={channelId} />
        <MessageInput channelId={channelId} />
      </div>

      {showMembers && <MemberList serverId={serverId} />}
    </div>
  )
}