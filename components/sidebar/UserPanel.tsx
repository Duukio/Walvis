'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Settings, LogOut, ChevronDown, Camera } from 'lucide-react'
import Image from 'next/image'
import NotificationBell from '@/components/notifications/NotificationBell'
import { useCall } from '@stream-io/video-react-sdk'


type Profile = {
  username: string
  avatar_url: string | null
  status: string
  banner_url: string | null
}

type Status = 'online' | 'away' | 'dnd' | 'invisible'

const STATUS_OPTIONS: { value: Status; label: string; color: string }[] = [
  { value: 'online',    label: 'Disponible',  color: 'bg-green-500' },
  { value: 'away',      label: 'Ausente',      color: 'bg-yellow-500' },
  { value: 'dnd',       label: 'No molestar',  color: 'bg-red-500' },
  { value: 'invisible', label: 'Invisible',    color: 'bg-gray-500' },
]

export default function UserPanel() {
  const supabase = createClient()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('online')
  const [showStatus, setShowStatus] = useState(false)
  const [uploading, setUploading] = useState(false)
  const call = useCall()

  useEffect(() => {
    fetchProfile()
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowStatus(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url, status, banner_url')
      .eq('id', user.id)
      .single()

    if (data) {
      setProfile(data)
      setStatus((data.status as Status) ?? 'online')
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    // Validar tamaño (max 2MB) y tipo
    if (file.size > 2 * 1024 * 1024) {
      alert('El archivo es muy grande. Máximo 2MB.')
      return
    }

    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten imágenes.')
      return
    }

    setUploading(true)

    try {
      const ext = file.name.split('.').pop()
      const path = `${userId}/avatar.${ext}`

      // Subir al storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)

      // Guardar en el perfil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)

      if (updateError) throw updateError

      setProfile((prev) => prev ? { ...prev, avatar_url: publicUrl } : prev)
    } catch (err) {
      console.error('Error subiendo avatar:', err)
      alert('Hubo un error al subir la imagen.')
    } finally {
      setUploading(false)
      // Limpiar input para permitir subir el mismo archivo de nuevo
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleStatusChange = async (newStatus: Status) => {
    setStatus(newStatus)
    setShowStatus(false)

    if (!userId) return
    await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', userId)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const bannerInputRef = useRef<HTMLInputElement>(null)

const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file || !userId) return

  if (file.size > 5 * 1024 * 1024) { alert('Máximo 5MB'); return }
  if (!file.type.startsWith('image/')) { alert('Solo imágenes'); return }

  setUploading(true)
  const ext = file.name.split('.').pop()
  const path = `${userId}/banner.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('backgrounds')
    .upload(path, file, { upsert: true })

  if (!uploadError) {
    const { data: { publicUrl } } = supabase.storage
      .from('backgrounds')
      .getPublicUrl(path)

    await supabase
      .from('profiles')
      .update({ banner_url: publicUrl })
      .eq('id', userId)

    setProfile((prev) => prev ? { ...prev, banner_url: publicUrl } : prev)
  }

  setUploading(false)
  if (bannerInputRef.current) bannerInputRef.current.value = ''
}


  const currentStatus = STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0]

  return (
    <aside className="w-60 bg-gray-800 border-l border-gray-900 flex flex-col shrink-0">
      {/* Banner */}
      <div
        className="relative h-20 shrink-0 cursor-pointer group overflow-hidden"
        style={{
          backgroundColor: '#312e81',
          backgroundImage: profile?.banner_url ? `url(${profile.banner_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        onClick={() => bannerInputRef.current?.click()}
      >
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera size={20} className="text-white" />
        </div>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          onChange={handleBannerChange}
          className="hidden"
        />
      </div>

      {/* Avatar sobre el banner */}
      <div className="px-4 pb-2 relative">
        <div className="relative -mt-8 w-16 h-16 group inline-block">
          <div
            className="w-full h-full rounded-full overflow-hidden border-4 border-gray-800 cursor-pointer relative"
            onClick={handleAvatarClick}
          >
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt="Avatar"
                width={64}
                height={64}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-xl font-bold text-white select-none">
                {profile?.username?.slice(0, 2).toUpperCase() ?? '??'}
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Camera size={16} className="text-white" />
              }
            </div>
          </div>
          <span className={`absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2 border-gray-800 ${currentStatus.color}`} />
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
        </div>

        <p className="text-white font-semibold mt-2">{profile?.username ?? '...'}</p>
      </div>

      <div className="flex flex-col px-4 gap-4" ref={menuRef}>
        {/* Selector de estado */}
        <div className="relative w-full">
          <button
            onClick={() => setShowStatus(!showStatus)}
            className="w-full flex items-center justify-between px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${currentStatus.color}`} />
              <span className="text-gray-200">{currentStatus.label}</span>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {showStatus && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 rounded shadow-lg border border-gray-700 z-10 overflow-hidden">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleStatusChange(opt.value)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-700 transition-colors ${
                    status === opt.value ? 'bg-gray-700' : ''
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${opt.color}`} />
                  <span className="text-gray-200">{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="w-full flex flex-col gap-1">
          <NotificationBell />
          <button
            onClick={async ()=> {window.dispatchEvent(new CustomEvent('leave-call'))
              router.push('/settings')
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <Settings size={16} />
            Ajustes
          </button>

          <button
            onClick={() => {}}
            className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Soporte
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </div>
    </aside>
  )
}