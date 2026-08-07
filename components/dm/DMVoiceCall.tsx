'use client'

import { useEffect, useState } from 'react'
import {
  CallingState,
  ParticipantView,
  StreamCall,
  useCall,
  useCallStateHooks,
} from '@stream-io/video-react-sdk'
import { useStreamContext } from '@/components/providers/StreamProvider'
import { useCallContext } from '@/components/providers/CallProvider'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Minimize2, Maximize2, Loader2 } from 'lucide-react'
import Image from 'next/image'

export default function DMVoiceCall({
  targetUser,
  isVideo = false,
}: {
  targetUser: { id: string; username: string; avatar_url: string | null }
  isVideo?: boolean
}) {
  const { activeCall } = useStreamContext()
  const [minimized, setMinimized] = useState(false)

  if (!activeCall) return null

  return (
    <StreamCall call={activeCall}>
      <DMVoiceCallUI
        targetUser={targetUser}
        isVideo={isVideo}
        minimized={minimized}
        onToggleMinimize={() => setMinimized(!minimized)}
      />
    </StreamCall>
  )
}

function DMVoiceCallUI({
  targetUser,
  isVideo,
  minimized,
  onToggleMinimize,
}: {
  targetUser: { id: string; username: string; avatar_url: string | null }
  isVideo: boolean
  minimized: boolean
  onToggleMinimize: () => void
}) {
  const call = useCall()
  const { endCall } = useCallContext()
  const { useCallCallingState, useParticipants, useMicrophoneState, useCameraState } = useCallStateHooks()

  const callingState = useCallCallingState()
  const participants = useParticipants()
  const { microphone, isMute: isMicMuted } = useMicrophoneState()
  const { camera, isMute: isCamMuted } = useCameraState()

  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (callingState !== CallingState.JOINED) return
    const timer = setInterval(() => {
      setDuration((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [callingState])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (callingState !== CallingState.JOINED) {
    return (
      <div className="bg-gray-800 border-b border-gray-700 p-3 flex items-center justify-center gap-2 text-gray-300 text-sm">
        <Loader2 size={18} className="animate-spin text-indigo-400" />
        Conectando llamada con {targetUser.username}...
      </div>
    )
  }

  // VISTA MINIMIZADA (BARRA SUPERIOR COMPACTA)
  if (minimized) {
    return (
      <div className="bg-gray-800/90 backdrop-blur border-b border-gray-700 px-4 py-2 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-white font-medium text-xs">
              Llamada de {isVideo ? 'video' : 'voz'} ({formatDuration(duration)})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => (isMicMuted ? microphone.enable() : microphone.disable())}
            className={`p-2 rounded-full transition-colors ${
              isMicMuted ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            }`}
            title={isMicMuted ? 'Dessilenciar' : 'Silenciar'}
          >
            {isMicMuted ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          <button
            onClick={() => (isCamMuted ? camera.enable() : camera.disable())}
            className={`p-2 rounded-full transition-colors ${
              isCamMuted ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            }`}
            title={isCamMuted ? 'Activar Cámara' : 'Apagar Cámara'}
          >
            {isCamMuted ? <VideoOff size={16} /> : <Video size={16} />}
          </button>

          <button
            onClick={endCall}
            className="p-2 rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors"
            title="Colgar"
          >
            <PhoneOff size={16} />
          </button>

          <button
            onClick={onToggleMinimize}
            className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors ml-2"
            title="Expandir"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>
    )
  }

  // VISTA EXPANDIDA
  return (
    <div className="bg-gray-800 border-b border-gray-700 flex flex-col p-4 z-20 shadow-lg relative">
      {/* Header de la llamada */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-700/60 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
            En llamada • {formatDuration(duration)}
          </span>
        </div>
        <button
          onClick={onToggleMinimize}
          className="text-gray-400 hover:text-white p-1 rounded transition-colors"
          title="Minimizar para seguir chateando"
        >
          <Minimize2 size={18} />
        </button>
      </div>

      {/* Grid de Participantes */}
      <div className="py-2">
        {isVideo || participants.some((p) => p.publishedTracks.includes('video' as any)) ? (
          <div className="grid grid-cols-2 gap-3 max-h-64">
            {participants.map((participant) => (
              <div key={participant.sessionId} className="aspect-video bg-gray-900 rounded-xl overflow-hidden relative shadow">
                <ParticipantView participant={participant} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-around py-4">
            {participants.map((participant) => {
              const isSpeaking = participant.isSpeaking
              return (
                <div key={participant.sessionId} className="flex flex-col items-center gap-2">
                  {/* Participant Hidden Render for audio tracks */}
                  <div className="opacity-0 absolute top-9999px left-9999px w-px h-px pointer-events-none">
                    <ParticipantView participant={participant} />
                  </div>

                  <div
                    className={`relative w-20 h-20 rounded-full overflow-hidden border-4 transition-all duration-300 ${
                      isSpeaking ? 'border-green-400 ring-4 ring-green-400/30 scale-105' : 'border-gray-700'
                    }`}
                  >
                    {participant.image ? (
                      <Image
                        src={participant.image}
                        alt={participant.name ?? 'Usuario'}
                        width={80}
                        height={80}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-2xl font-bold text-white">
                        {participant.name?.slice(0, 2).toUpperCase() ?? '??'}
                      </div>
                    )}
                  </div>

                  <span className="text-white text-xs font-medium">{participant.name ?? 'Usuario'}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Barra de Controles de la Llamada */}
      <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-gray-700/60">
        <button
          onClick={() => (isMicMuted ? microphone.enable() : microphone.disable())}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors shadow ${
            isMicMuted ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
          }`}
          title={isMicMuted ? 'Activar micrófono' : 'Silenciar'}
        >
          {isMicMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button
          onClick={() => (isCamMuted ? camera.enable() : camera.disable())}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors shadow ${
            isCamMuted ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
          }`}
          title={isCamMuted ? 'Activar cámara' : 'Apagar cámara'}
        >
          {isCamMuted ? <VideoOff size={20} /> : <Video size={20} />}
        </button>

        <button
          onClick={endCall}
          className="w-11 h-11 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-colors shadow"
          title="Colgar"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  )
}
