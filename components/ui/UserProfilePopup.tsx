'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import StatusIndicator from './StatusIndicator'

type Profile = {
  id: string
  username: string
  avatar_url: string | null
  banner_url: string | null
  status: string
  nickname_color: string | null
  bio: string | null // NUEVO
}

type Role = {
  id: string
  name: string
  color: string
}

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
  const [nickname, setNickname] = useState<string | null>(null) // NUEVO: Apodo local
  const [roles, setRoles] = useState<Role[]>([])
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const STATUS_LABELS: Record<string, string> = {
    online: 'Disponible',
    away: 'Ausente',
    dnd: 'Do not disturb',
    invisible: 'Invisible',
  }

  useEffect(() => {
    const fetchProfileAndServerData = async () => {
      // 1. Cargar datos del perfil incluyendo la nueva columna BIO
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, banner_url, status, nickname_color, bio')
        .eq('id', userId)
        .single()

      if (data) setProfile(data)

      // 2. Si estamos en un contexto de servidor, cargar roles y apodo
      if (serverId) {
        // Traer apodo local
        const { data: memberData } = await supabase
          .from('members')
          .select('nickname')
          .eq('server_id', serverId)
          .eq('user_id', userId)
          .single()

        if (memberData) setNickname(memberData.nickname)

        // Traer roles del miembro
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

  // Si tiene apodo local en el server, lo usa de título principal
  const hasNickname = !!nickname
  const mainDisplay = nickname || profile.username

  return (
    <div
      ref={popupRef}
      className="fixed z-50 w-72 bg-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-700"
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

      {/* Avatar */}
      <div className="px-4 pb-4 relative">
        <div className="relative -mt-8 w-16 h-16 inline-block">
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

        {/* Nombres (Apodo prioritario + nombre de usuario abajo si difieren) */}
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

        {/* NUEVO: Descripción de Perfil (Bio) */}
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