'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStreamContext } from '@/components/providers/StreamProvider'
import { ringtonePlayer } from '@/lib/utils/ringtone'
import { Phone, PhoneOff, Video, Mic, Volume2 } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

type UserProfile = {
  id: string
  username: string
  avatar_url: string | null
}

type CallSignal = {
  callerId: string
  callerName: string
  callerAvatar: string | null
  callId: string
  isVideo: boolean
}

type CallContextType = {
  incomingCall: CallSignal | null
  outgoingCall: CallSignal | null
  activeDMCall: { targetUser: UserProfile; callId: string; isVideo: boolean } | null
  startCall: (targetUser: UserProfile, isVideo?: boolean) => Promise<void>
  acceptCall: () => Promise<void>
  rejectCall: () => Promise<void>
  endCall: () => Promise<void>
}

const CallContext = createContext<CallContextType>({
  incomingCall: null,
  outgoingCall: null,
  activeDMCall: null,
  startCall: async () => {},
  acceptCall: async () => {},
  rejectCall: async () => {},
  endCall: async () => {},
})

export const useCallContext = () => useContext(CallContext)

export default function CallProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const router = useRouter()
  const { joinVoiceChannel, leaveVoiceChannel, activeCall } = useStreamContext()

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null)

  const [incomingCall, setIncomingCall] = useState<CallSignal | null>(null)
  const [outgoingCall, setOutgoingCall] = useState<CallSignal | null>(null)
  const [activeDMCall, setActiveDMCall] = useState<{ targetUser: UserProfile; callId: string; isVideo: boolean } | null>(null)

  // Obtener datos del usuario logueado
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', user.id)
        .single()

      if (profile) setCurrentUserProfile(profile)
    }
    init()
  }, [])

  // Escuchar señalización de llamadas en tiempo real
  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase.channel(`dm-calls:${currentUserId}`)

    channel
      .on('broadcast', { event: 'incoming_call' }, ({ payload }) => {
        // Si ya está en llamada o llamando, rechazar automáticamente
        if (activeDMCall || outgoingCall) {
          channel.send({
            type: 'broadcast',
            event: 'call_rejected',
            payload: { callId: payload.callId, reason: 'busy' },
          })
          return
        }

        setIncomingCall(payload)
        ringtonePlayer.startRingtone()
      })
      .on('broadcast', { event: 'call_accepted' }, async ({ payload }) => {
        ringtonePlayer.stopRingtone()

        if (outgoingCall && outgoingCall.callId === payload.callId) {
          const targetUser: UserProfile = {
            id: outgoingCall.callerId, // En outgoingCall guardamos el id del destinatario en callerId por conveniencia
            username: outgoingCall.callerName,
            avatar_url: outgoingCall.callerAvatar,
          }
          setActiveDMCall({
            targetUser,
            callId: payload.callId,
            isVideo: outgoingCall.isVideo,
          })
          setOutgoingCall(null)
        }
      })
      .on('broadcast', { event: 'call_rejected' }, async ({ payload }) => {
        ringtonePlayer.stopRingtone()
        if (outgoingCall && outgoingCall.callId === payload.callId) {
          setOutgoingCall(null)
          await leaveVoiceChannel()
          alert('La llamada fue rechazada o el usuario está ocupado.')
        }
      })
      .on('broadcast', { event: 'call_ended' }, async ({ payload }) => {
        ringtonePlayer.stopRingtone()
        setIncomingCall(null)
        setOutgoingCall(null)
        setActiveDMCall(null)
        await leaveVoiceChannel()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, outgoingCall, activeDMCall])

  // Iniciar una llamada hacia targetUser
  const startCall = async (targetUser: UserProfile, isVideo: boolean = false) => {
    if (!currentUserId || !currentUserProfile) return

    const callId = `dm-${[currentUserId, targetUser.id].sort().join('-')}`

    // 1. Unirse localmente a la sala de Stream
    await joinVoiceChannel(callId)

    // 2. Establecer llamada saliente
    const callSignal: CallSignal = {
      callerId: targetUser.id,
      callerName: targetUser.username,
      callerAvatar: targetUser.avatar_url,
      callId,
      isVideo,
    }
    setOutgoingCall(callSignal)
    ringtonePlayer.startRingtone()

    // 3. Notificar al destinatario mediante broadcast
    const targetChannel = supabase.channel(`dm-calls:${targetUser.id}`)
    await targetChannel.subscribe()
    await targetChannel.send({
      type: 'broadcast',
      event: 'incoming_call',
      payload: {
        callerId: currentUserId,
        callerName: currentUserProfile.username,
        callerAvatar: currentUserProfile.avatar_url,
        callId,
        isVideo,
      },
    })
  }

  // Aceptar llamada entrante
  const acceptCall = async () => {
    if (!incomingCall || !currentUserId) return

    ringtonePlayer.stopRingtone()
    const callId = incomingCall.callId
    const callerId = incomingCall.callerId

    // 1. Unirse a la sala de Stream
    await joinVoiceChannel(callId)

    // 2. Notificar al emisor que aceptamos
    const callerChannel = supabase.channel(`dm-calls:${callerId}`)
    await callerChannel.subscribe()
    await callerChannel.send({
      type: 'broadcast',
      event: 'call_accepted',
      payload: { callId },
    })

    // 3. Activar llamada localmente
    setActiveDMCall({
      targetUser: {
        id: incomingCall.callerId,
        username: incomingCall.callerName,
        avatar_url: incomingCall.callerAvatar,
      },
      callId,
      isVideo: incomingCall.isVideo,
    })

    setIncomingCall(null)

    // Redirigir al chat de DM con esa persona si no está ahí
    router.push(`/home/dm/${incomingCall.callerId}`)
  }

  // Rechazar llamada entrante
  const rejectCall = async () => {
    if (!incomingCall) return

    ringtonePlayer.stopRingtone()

    const callerChannel = supabase.channel(`dm-calls:${incomingCall.callerId}`)
    await callerChannel.subscribe()
    await callerChannel.send({
      type: 'broadcast',
      event: 'call_rejected',
      payload: { callId: incomingCall.callId },
    })

    setIncomingCall(null)
  }

  // Finalizar / Colgar llamada
  const endCall = async () => {
    ringtonePlayer.stopRingtone()

    const targetId = activeDMCall?.targetUser.id || outgoingCall?.callerId || incomingCall?.callerId

    if (targetId) {
      const targetChannel = supabase.channel(`dm-calls:${targetId}`)
      await targetChannel.subscribe()
      await targetChannel.send({
        type: 'broadcast',
        event: 'call_ended',
        payload: { callId: activeDMCall?.callId || outgoingCall?.callId || incomingCall?.callId },
      })
    }

    setIncomingCall(null)
    setOutgoingCall(null)
    setActiveDMCall(null)

    await leaveVoiceChannel()
  }

  return (
    <CallContext.Provider
      value={{
        incomingCall,
        outgoingCall,
        activeDMCall,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
      }}
    >
      {children}

      {/* MODAL DE LLAMADA ENTRANTE */}
      {incomingCall && (
        <div className="fixed top-5 right-5 z-50 bg-gray-800 text-white border border-gray-700 shadow-2xl rounded-2xl p-4 w-80 animate-bounce-short backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-indigo-500">
              {incomingCall.callerAvatar ? (
                <Image src={incomingCall.callerAvatar} alt={incomingCall.callerName} width={48} height={48} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full bg-indigo-600 flex items-center justify-center font-bold text-lg">
                  {incomingCall.callerName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{incomingCall.callerName}</p>
              <p className="text-xs text-indigo-400 flex items-center gap-1">
                {incomingCall.isVideo ? <Video size={13} /> : <Phone size={13} />}
                Llamada de {incomingCall.isVideo ? 'video' : 'voz'} entrante...
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-4">
            <button
              onClick={rejectCall}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-semibold transition-colors shadow"
            >
              <PhoneOff size={14} /> Rechazar
            </button>
            <button
              onClick={acceptCall}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-green-600 hover:bg-green-500 rounded-xl text-xs font-semibold transition-colors shadow animate-pulse"
            >
              <Phone size={14} /> Aceptar
            </button>
          </div>
        </div>
      )}

      {/* OVERLAY DE LLAMADA SALIENTE (LLAMANDO...) */}
      {outgoingCall && (
        <div className="fixed top-5 right-5 z-50 bg-gray-800 text-white border border-gray-700 shadow-2xl rounded-2xl p-4 w-80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-indigo-500 animate-pulse">
              {outgoingCall.callerAvatar ? (
                <Image src={outgoingCall.callerAvatar} alt={outgoingCall.callerName} width={48} height={48} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full bg-indigo-600 flex items-center justify-center font-bold text-lg">
                  {outgoingCall.callerName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{outgoingCall.callerName}</p>
              <p className="text-xs text-gray-400">Llamando...</p>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={endCall}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-semibold transition-colors shadow"
            >
              <PhoneOff size={14} /> Cancelar
            </button>
          </div>
        </div>
      )}
    </CallContext.Provider>
  )
}
