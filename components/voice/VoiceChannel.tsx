'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Call,
  CallingState,
  ParticipantView,
  StreamCall,
  useCall,
  useCallStateHooks,
  useStreamVideoClient,
} from '@stream-io/video-react-sdk'
import { useRouter } from 'next/navigation'
import { Loader2, Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react'
import Image from 'next/image'

let globalCallActive = false

export default function VoiceChannel({
  channelId,
  channelName,
  isVideo = false,
}: {
  channelId: string
  channelName: string
  isVideo?: boolean
}) {
  const client = useStreamVideoClient()
  const [call, setCall] = useState<Call | null>(null)
  const [loading, setLoading] = useState(true)
  const joinedRef = useRef(false)


useEffect(() => {
  const handler = async () => {
    if (joinedRef.current || globalCallActive) {
      await client?.call('default', channelId).leave().catch(() => {})
      joinedRef.current = false
      globalCallActive = false
      setCall(null)
    }
  }
  window.addEventListener('leave-call', handler)
  return () => window.removeEventListener('leave-call', handler)
}, [client, channelId])

useEffect(() => {
  if (!client || joinedRef.current || globalCallActive) return

  const joinCall = async () => {
    joinedRef.current = true
    globalCallActive = true
    setLoading(true)
    try {
      const callInstance = client.call('default', channelId)
      await callInstance.join({ create: true })
      setCall(callInstance)
    } catch (err) {
      console.error('Error al unirse al canal:', err)
      joinedRef.current = false
      globalCallActive = false
    } finally {
      setLoading(false)
    }
  }

  joinCall()

  return () => {
    if (joinedRef.current) {
      client.call('default', channelId).leave().catch(() => {})
      joinedRef.current = false
      globalCallActive = false
      setCall(null)
    }
  }
}, [client, channelId])

  if (!client || loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
        <Loader2 size={32} className="animate-spin" />
        <p className="text-sm">Conectando a {channelName}...</p>
      </div>
    )
  }

  if (!call) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        No se pudo conectar al canal
      </div>
    )
  }

  return (
    <StreamCall call={call}>
      <VoiceCallUI channelName={channelName} isVideo={isVideo} channelId={channelId} />
    </StreamCall>
  )
}

function CustomCallControls({ channelId }: { channelId: string }) {
  const call = useCall()
  const router = useRouter()
  const { useMicrophoneState, useCameraState } = useCallStateHooks()
  const { microphone, isMute: isMicMuted } = useMicrophoneState()
  const { camera, isMute: isCamMuted } = useCameraState()

  const handleLeave = async () => {
    await call?.leave()
    const serverId = window.location.pathname.split('/')[2]
    router.push(`/servers/${serverId}`)
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => isMicMuted ? microphone.enable() : microphone.disable()}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
          isMicMuted ? 'bg-red-500 hover:bg-red-400' : 'bg-gray-600 hover:bg-gray-500'
        }`}
        title={isMicMuted ? 'Activar micrófono' : 'Silenciar'}
      >
        {isMicMuted
          ? <MicOff size={20} className="text-white" />
          : <Mic size={20} className="text-white" />
        }
      </button>

      <button
        onClick={() => isCamMuted ? camera.enable() : camera.disable()}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
          isCamMuted ? 'bg-red-500 hover:bg-red-400' : 'bg-gray-600 hover:bg-gray-500'
        }`}
        title={isCamMuted ? 'Activar cámara' : 'Apagar cámara'}
      >
        {isCamMuted
          ? <VideoOff size={20} className="text-white" />
          : <Video size={20} className="text-white" />
        }
      </button>

      <button
        onClick={handleLeave}
        className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition-colors"
        title="Salir"
      >
        <PhoneOff size={20} className="text-white" />
      </button>
    </div>
  )
}

function VoiceCallUI({
  channelName,
  isVideo,
  channelId,
}: {
  channelName: string
  isVideo: boolean
  channelId: string
}) {
  const { useCallCallingState, useParticipants } = useCallStateHooks()
  const callingState = useCallCallingState()
  const participants = useParticipants()

  if (callingState !== CallingState.JOINED) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        <Loader2 size={24} className="animate-spin mr-2" />
        Uniéndose...
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-700">
      <div className="h-12 px-4 flex items-center border-b border-gray-600">
        <span className="text-white font-medium">
          {isVideo ? '🎥' : '🔊'} {channelName}
        </span>
        <span className="ml-3 text-gray-400 text-sm">
          {participants.length} participante{participants.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {isVideo ? (
          <div className="grid grid-cols-2 gap-3 auto-rows-fr">
            {participants.map((participant) => (
              <div
                key={participant.sessionId}
                className="aspect-video bg-gray-800 rounded-lg overflow-hidden"
              >
                <ParticipantView participant={participant} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {participants.map((participant) => {
  const isMicMuted = !participant.publishedTracks?.includes(2)
  return (
    <div key={participant.sessionId}>
      {/* ParticipantView oculto para reproducir el audio */}
      <div className="hidden">
        <ParticipantView participant={participant} />
      </div>

      <div className="flex items-center gap-3 px-3 py-2 rounded bg-gray-600/50">
        <div className={`relative w-10 h-10 rounded-full shrink-0 transition-all duration-200 ${
          participant.isSpeaking
            ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-gray-600'
            : 'ring-2 ring-transparent'
        }`}>
          {participant.image ? (
            <Image
              src={participant.image}
              alt={participant.name ?? 'Usuario'}
              width={40}
              height={40}
              className="object-cover w-full h-full rounded-full"
            />
          ) : (
            <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white rounded-full">
              {participant.name?.slice(0, 2).toUpperCase() ?? '??'}
            </div>
          )}
        </div>

        <span className="text-gray-200 text-sm flex-1">
          {participant.name ?? 'Usuario'}
        </span>

        <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-200 ${
          participant.isSpeaking
            ? 'bg-green-400 animate-pulse'
            : isMicMuted
            ? 'bg-red-500'
            : 'bg-gray-500'
        }`} />
      </div>
    </div>
  )
})}

            {participants.length === 0 && (
              <div className="text-center text-gray-400 text-sm mt-8">
                Nadie en el canal todavía
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-gray-600 p-4 flex justify-center bg-gray-800">
        <CustomCallControls channelId={channelId} />
      </div>
    </div>
  )
}