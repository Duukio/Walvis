'use client'

import { useEffect, useState } from 'react'
import { StreamVideo, StreamVideoClient } from '@stream-io/video-react-sdk'
import { createClient } from '@/lib/supabase/client'

export default function StreamProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [client, setClient] = useState<StreamVideoClient | null>(null)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Obtener perfil para el nombre de usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single()

      // Obtener token del servidor
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

  return <StreamVideo client={client}>{children}</StreamVideo>
}