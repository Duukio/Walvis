'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import StatusIndicator from './StatusIndicator'
import { UserPlus, UserCheck, Clock, Loader2, UserX } from 'lucide-react'

type Profile = {
  id: string
  username: string
  avatar_url: string | null
  banner_url: string | null
  status: string
  nickname_color: string | null
  bio: string | null
}

type Role = {
  id: string
  name: string
  color: string
}

type FriendStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted'

export default function UserProfilePopup({
  userId,
  serverId,
  onClose,
  anchorRef,
}: {
  userId: string
  serverId?: string
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement>
}) {
  const supabase = createClient()
  const popupRef = useRef<HTMLDivElement>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [nickname, setNickname] = useState<string | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [position, setPosition] = useState({ top: 0, left: 0 })

  // Estados para controlar el flujo de amistades
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [friendStatus, setFriendStatus] = useState<FriendStatus>('none')
  const [loadingFriendship, setLoadingFriendship] = useState(false)

  const STATUS_LABELS: Record<string, string> = {
    online: 'Disponible',
    away: 'Ausente',
    dnd: 'No molestar',
    invisible: 'Invisible',
  }

  useEffect(() => {
    const fetchProfileAndServerData = async () => {
      // Obtener el ID del usuario logueado actualmente
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)

      // 1. Cargar datos del perfil incluyendo la columna BIO
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, banner_url, status, nickname_color, bio')
        .eq('id', userId)
        .single()

      if (profileData) setProfile(profileData)

      // 2. Comprobar el estado de amistad existente si no es tu propio perfil
      if (user && user.id !== userId) {
        const { data: friendships } = await supabase
          .from('friendships')
          .select('sender_id, receiver_id, status')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)

        if (friendships && friendships.length > 0) {
          const relation = friendships[0]
          if (relation.status === 'accepted') {
            setFriendStatus('accepted')
          } else if (relation.status === 'pending') {
            if (relation.sender_id === user.id) {
              setFriendStatus('pending_sent')
            } else {
              setFriendStatus('pending_received')
            }
          }
        }
      }

      // 3. Si estamos en un contexto de servidor, cargar roles y apodo
      if (serverId) {
        const { data: memberData } = await supabase
          .from('members')
          .select('nickname')
          .eq('server_id', serverId)
          .eq('user_id', userId)
          .maybeSingle() // Usamos maybeSingle para evitar excepciones si arroja vacío

        if (memberData) setNickname(memberData.nickname)

        const { data: memberRoles } = await supabase
          .from('member_roles')
          .select('role_id')
          .eq('user_id', userId)
          .eq('server_id', serverId)

        if (memberRoles?.length) {
          const roleIds = memberRoles.map(mr => mr.role_id)
          const { data: rolesData } = await supabase
            .from('roles')
            .select('id, name, color')
            .in('id', roleIds)
            .order('position', { ascending: false })

          if (rolesData) setRoles(rolesData)
        }
      }
    }

    fetchProfileAndServerData()
  }, [userId, serverId])

  // Lógica interactiva para procesar las amistades
  const handleFriendAction = async () => {
    if (!currentUserId || !profile || loadingFriendship) return
    setLoadingFriendship(true)

    try {
      if (friendStatus === 'none') {
        // Enviar una solicitud inicial
        const { error } = await supabase
          .from('friendships')
          .insert({ sender_id: currentUserId, receiver_id: profile.id, status: 'pending' })
        
        if (!error) setFriendStatus('pending_sent')
      } else if (friendStatus === 'pending_received') {
        // Aceptar una solicitud entrante
        const { error } = await supabase
          .from('friendships')
          .update({ status: 'accepted' })
          .eq('sender_id', profile.id)
          .eq('receiver_id', currentUserId)
        
        if (!error) setFriendStatus('accepted')
      } else if (friendStatus === 'accepted' || friendStatus === 'pending_sent') {
        // Cancelar la enviada o eliminar amigo definitivo
        const { error } = await supabase
          .from('friendships')
          .delete()
          .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${profile.id}),and(sender_id.eq.${profile.id},receiver_id.eq.${currentUserId})`)
        
        if (!error) setFriendStatus('none')
      }
    } catch (err) {
      console.error('Error al actualizar relación de amistad:', err)
    } finally {
      setLoadingFriendship(false)
    }
  }

  // Posicionar el popup cerca del elemento clickeado
  useEffect(() => {
    if (!anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    const popupWidth = 280
    const left = Math.min(rect.right + 8, window.innerWidth - popupWidth - 8)
    setPosition({ top: rect.top, left })
  }, [anchorRef])

  // Cerrar al clickear afuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  if (!profile) return null

  const hasNickname = !!nickname
  const mainDisplay = nickname || profile.username
  const isMe = currentUserId === profile.id

  return (
    <div
      ref={popupRef}
      className="fixed z-50 w-72 bg-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-700 text-white"
      style={{ top: position.top, left: position.left }}
    >
      {/* Banner */}
      <div
        className="h-16 w-full"
        style={{
          backgroundColor: profile.nickname_color ?? '#312e81',
          backgroundImage: profile.banner_url ? `url(${profile.banner_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

{/* Contenedor del Avatar y Acciones Superiores */}
      <div className="px-4 relative flex items-start justify-between">
        {/* Avatar */}
        <div className="relative -mt-8 w-16 h-16 inline-block shrink-0">
          <div className="w-full h-full rounded-full overflow-hidden border-4 border-gray-900">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={mainDisplay}
                width={64}
                height={64}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-xl font-bold text-white">
                {mainDisplay.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="absolute bottom-0.5 right-0.5 border-2 border-gray-900 rounded-full">
            <StatusIndicator userId={profile.id} initialStatus={profile.status as any} size="md" />
          </div>
        </div>

        {/*Botón de Amistad */}
        {!isMe && currentUserId && (
          <div className="mt-2">
            <button
              onClick={handleFriendAction}
              disabled={loadingFriendship}
              title={
                friendStatus === 'none' 
                  ? 'Enviar solicitud' 
                  : friendStatus === 'pending_sent' 
                  ? 'Cancelar solicitud' 
                  : friendStatus === 'pending_received' 
                  ? 'Aceptar solicitud' 
                  : 'Eliminar amigo'
              }
              className={`py-1 px-2.5 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border bg-transparent cursor-pointer group ${
                friendStatus === 'none'
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-transparent'
                  : friendStatus === 'pending_sent'
                  ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-red-950/40 hover:text-red-400 hover:border-red-500/30'
                  : friendStatus === 'pending_received'
                  ? 'bg-green-600 hover:bg-green-500 text-white border-transparent animate-pulse'
                  : 'text-green-400 border-green-500/20 hover:bg-red-950/40 hover:text-red-400 hover:border-red-500/30'
              }`}
            >
              {loadingFriendship ? (
                <Loader2 size={13} className="animate-spin" />
              ) : friendStatus === 'none' ? (
                <>
                  <UserPlus size={13} />
                  <span>Agregar</span>
                </>
              ) : friendStatus === 'pending_sent' ? (
                <>
                  <Clock size={13} className="inline group-hover:hidden" />
                  <UserX size={13} className="hidden group-hover:inline" />
                  <span className="inline group-hover:hidden">Enviada</span>
                  <span className="hidden group-hover:inline">Cancelar</span>
                </>
              ) : friendStatus === 'pending_received' ? (
                <>
                  <UserPlus size={13} />
                  <span>Aceptar</span>
                </>
              ) : (
                <>
                  <UserCheck size={13} className="inline group-hover:hidden" />
                  <UserX size={13} className="hidden group-hover:inline" />
                  <span className="inline group-hover:hidden">Amigos</span>
                  <span className="hidden group-hover:inline">Eliminar</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Bloque de Información Inferior (Nombres, Bio, Roles) */}
      <div className="px-4 pb-4">
        {/* Nombres */}
        <div className="mt-2 flex flex-col">
          <p
            className="text-lg font-bold leading-tight"
            style={{ color: profile.nickname_color ?? '#ffffff' }}
          >
            {mainDisplay}
          </p>
          {hasNickname && (
            <p className="text-gray-400 text-xs font-medium">
              {profile.username}
            </p>
          )}
        </div>

        {/* Estado */}
        <p className="text-gray-400 text-xs mt-1">{STATUS_LABELS[profile.status] ?? profile.status}</p>

        {/* Descripción de Perfil (Bio) */}
        {profile.bio && (
          <div className="mt-3 pt-3 border-t border-gray-800">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1">
              Sobre mí
            </p>
            <p className="text-gray-200 text-xs whitespace-pre-wrap break-words leading-normal">
              {profile.bio}
            </p>
          </div>
        )}

        {/* Roles */}
        {roles.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-800">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1.5">
              Roles
            </p>
            <div className="flex flex-wrap gap-1.5">
              {roles.map((role) => (
                <span
                  key={role.id}
                  className="text-[10px] px-2 py-0.5 rounded-full text-white font-semibold tracking-wide"
                  style={{ backgroundColor: role.color }}
                >
                  {role.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}