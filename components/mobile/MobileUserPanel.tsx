'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Settings, LogOut, ChevronUp, Camera, Mic, MicOff, Headphones, HeadphoneOff } from 'lucide-react'
import Image from 'next/image'
import NotificationBell from '@/components/notifications/NotificationBell'

type Profile = {
  username: string
  avatar_url: string | null
  status: string
  banner_url: string | null
}

type Status = 'online' | 'away' | 'dnd' | 'invisible'

const STATUS_OPTIONS: { value: Status; label: string; color: string }[] = [
  { value: 'online', label: 'Disponible', color: 'bg-green-500' },
  { value: 'away', label: 'Ausente', color: 'bg-yellow-500' },
  { value: 'dnd', label: 'No molestar', color: 'bg-red-500' },
  { value: 'invisible', label: 'Invisible', color: 'bg-gray-500' },
]

export default function MobileUserPanel() {
  const supabase = createClient()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('online')
  const [isOpen, setIsOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isDeafened, setIsDeafened] = useState(false)

  useEffect(() => {
    fetchProfile()
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

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

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

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)

      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)

      setProfile((prev) => prev ? { ...prev, avatar_url: publicUrl } : prev)
    } catch (err) {
      console.error('Error subiendo avatar:', err)
      alert('Hubo un error al subir la imagen.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleStatusChange = async (newStatus: Status) => {
    setStatus(newStatus)
    if (!userId) return
    await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', userId)
  }

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0]

  return (
    <div className="shrink-0">
      {/* Barra colapsada */}
      <div
        className="h-14 bg-gray-900 border-t border-gray-700 flex items-center px-4 gap-3 cursor-pointer hover:bg-gray-800/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-600">
            {profile?.avatar_url ? (
              <Image src={profile.avatar_url} alt="Avatar" width={32} height={32} className="object-cover w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                {profile?.username?.slice(0, 2).toUpperCase() ?? '??'}
              </div>
            )}
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900 ${currentStatus.color}`} />
        </div>

        {/* Nombre */}
        <span className="text-white text-sm font-medium flex-1 truncate">
          {profile?.username ?? 'Cargando...'}
        </span>

        {/* Acciones rápidas */}
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted) }}
            className={`p-1.5 rounded ${isMuted ? 'text-red-400 bg-red-400/10' : 'text-gray-400 hover:text-white'}`}
          >
            {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIsDeafened(!isDeafened) }}
            className={`p-1.5 rounded ${isDeafened ? 'text-red-400 bg-red-400/10' : 'text-gray-400 hover:text-white'}`}
          >
            {isDeafened ? <HeadphoneOff size={16} /> : <Headphones size={16} />}
          </button>
          <ChevronUp size={18} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Panel expandido */}
      {isOpen && (
        <div className="bg-gray-900 border-t border-gray-800 animate-slide-up max-h-[70vh] overflow-y-auto">
          {/* Banner */}
          <div
            className="relative h-24 cursor-pointer group overflow-hidden"
            style={{
              backgroundColor: '#312e81',
              backgroundImage: profile?.banner_url ? `url(${profile.banner_url})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            onClick={(e) => { e.stopPropagation(); bannerInputRef.current?.click() }}
          >
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={20} className="text-white" />
            </div>
            <input ref={bannerInputRef} type="file" accept="image/*" onChange={handleBannerChange} className="hidden" />
          </div>

          {/* Avatar y nombre */}
          <div className="px-4 pb-3 relative">
            <div className="relative -mt-8 w-14 h-14 group inline-block">
              <div
                className="w-full h-full rounded-full overflow-hidden border-[3px] border-gray-900 cursor-pointer relative bg-indigo-600"
                onClick={handleAvatarClick}
              >
                {profile?.avatar_url ? (
                  <Image src={profile.avatar_url} alt="Avatar" width={56} height={56} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white">
                    {profile?.username?.slice(0, 2).toUpperCase() ?? '??'}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera size={14} className="text-white" />
                  )}
                </div>
              </div>
              <span className={`absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-gray-900 ${currentStatus.color}`} />
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </div>
            <p className="text-white font-semibold mt-1.5 text-sm">{profile?.username ?? 'Cargando...'}</p>
          </div>

          {/* Estados */}
          <div className="px-4 mb-3">
            <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-2">Estado</p>
            <div className="grid grid-cols-2 gap-1.5">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={(e) => { e.stopPropagation(); handleStatusChange(opt.value) }}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-xs transition-colors ${
                    status === opt.value
                      ? 'bg-indigo-500/20 text-indigo-300'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${opt.color} shrink-0`} />
                  <span className="truncate">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Acciones */}
          <div className="px-4 pb-4 space-y-1">
            <NotificationBell />
            <button
              onClick={() => { router.push('/settings'); setIsOpen(false) }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <Settings size={16} />
              Ajustes
            </button>
            <button
              onClick={() => {}}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Soporte
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
            >
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  )
}