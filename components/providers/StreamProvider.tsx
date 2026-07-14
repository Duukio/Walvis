'use client'

import { useEffect, useState, createContext, useContext, useRef } from 'react'
import { StreamVideo, StreamVideoClient, Call, CallingState } from '@stream-io/video-react-sdk'
import { createClient } from '@/lib/supabase/client'

type StreamContextType = {
  activeCall: Call | null
  joinVoiceChannel: (channelId: string) => Promise<Call | null>
  leaveVoiceChannel: () => Promise<void>
}

export const StreamContext = createContext<StreamContextType>({
  activeCall: null,
  joinVoiceChannel: async () => null,
  leaveVoiceChannel: async () => {},
})

export const useStreamContext = () => useContext(StreamContext)

export default function StreamProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [client, setClient] = useState<StreamVideoClient | null>(null)
  const [activeCall, setActiveCall] = useState<Call | null>(null)
  
  const activeCallRef = useRef<Call | null>(null)
  const joiningChannelId = useRef<string | null>(null)

  useEffect(() => {
    let streamClient: StreamVideoClient | null = null

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

      streamClient = new StreamVideoClient({
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

    return () => {
      if (streamClient) {
        streamClient.disconnectUser().catch((err) => console.error('Error al desconectar cliente Stream:', err))
      }
    }
  }, [])

  const joinVoiceChannel = async (channelId: string): Promise<Call | null> => {
    if (!client) return null

    // Bloqueo síncronizado estricto: Si ya se está procesando o está activa, no hace nada
    if (joiningChannelId.current === channelId || activeCallRef.current?.id === channelId) {
      return activeCallRef.current
    }

    joiningChannelId.current = channelId

    try {
      if (activeCallRef.current) {
        const oldCall = activeCallRef.current
        activeCallRef.current = null
        setActiveCall(null)
        try {
          if (oldCall.state.callingState !== 'left') {
            await oldCall.leave()
          }
        } catch {}
      }

      if (joiningChannelId.current !== channelId) return null

      // Instanciamos la llamada de forma limpia
      const newCall = client.call('audio_room', channelId)
      
      // Unirse a la llamada en los servidores de Stream
      await newCall.join({ create: true })

      console.log(Object.keys(newCall.microphone))
      console.dir(newCall.microphone)

      // IMPORTANTE: Habilitamos el hardware de micrófono INMEDIATAMENTE después de un join exitoso
      try {
        await newCall.microphone.enable()
        await newCall.camera.disable()
      } catch (micErr) {
        console.error("Error al inicializar dispositivos multimedia:", micErr)
      }

      if (joiningChannelId.current === channelId) {
        activeCallRef.current = newCall
        setActiveCall(newCall)
        return newCall
      } else {
        newCall.leave().catch(() => {})
        return null
      }
    } catch (error) {
      console.error('Error al unirse al canal de voz en StreamProvider:', error)
      if (joiningChannelId.current === channelId) {
        joiningChannelId.current = null
      }
      return null
    }
  };

  const leaveVoiceChannel = async () => {
    joiningChannelId.current = null
    if (activeCallRef.current) {
      const callToLeave = activeCallRef.current
      activeCallRef.current = null
      setActiveCall(null)
      try {
        if (callToLeave.state.callingState !== 'left') {
          await callToLeave.leave()
        }
      } catch (err) {
        console.error('Error al abandonar canal de voz:', err)
      }
    }
  };

  useEffect(() => {
    const handler = () => { leaveVoiceChannel() }
    window.addEventListener('leave-call', handler)
    return () => window.removeEventListener('leave-call', handler)
  }, [])

  if (!client) return <>{children}</>

  return (
    <StreamContext.Provider value={{ activeCall, joinVoiceChannel, leaveVoiceChannel }}>
      <StreamVideo client={client}>{children}</StreamVideo>
    </StreamContext.Provider>
  )
}