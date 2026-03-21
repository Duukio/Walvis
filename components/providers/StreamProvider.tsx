'use client'

import { useEffect, useState, createContext, useContext } from 'react'
import { StreamVideo, StreamVideoClient, Call } from '@stream-io/video-react-sdk'
import { createClient } from '@/lib/supabase/client'

type StreamContextType = {
  activeCall: Call | null
  setActiveCall: (call: Call | null) => void
}

export const StreamContext = createContext<StreamContextType>({
  activeCall: null,
  setActiveCall: () => {},
})

export const useStreamContext = () => useContext(StreamContext)

export default function StreamProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [client, setClient] = useState<StreamVideoClient | null>(null)
  const [activeCall, setActiveCall] = useState<Call | null>(null)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single()

      const res = await fetch('/api/stream/token')
      const { token } = await res.json()

      const streamClient = new StreamVideoClient({
        apiKey: process.env.NEXT_PUBLIC_STREAM_API_KEY!,
        user: {
          id: user.id,
          name: profile?.username ?? user.email ?? 'Usuario',
          image: profile?.avatar_url ?? undefined,
        },
        token,
      })

      setClient(streamClient)
    }

    init()
  }, [])

  if (!client) return <>{children}</>

  return (
    <StreamContext.Provider value={{ activeCall, setActiveCall }}>
      <StreamVideo client={client}>{children}</StreamVideo>
    </StreamContext.Provider>
  )
}