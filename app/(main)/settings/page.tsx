'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/providers/ThemeProvider'
import { ArrowLeft, Save, Loader2, Camera } from 'lucide-react'

type Profile = {
  username: string
  nickname_color: string
  theme: string
  bio: string | null
  dm_bg_url: string | null
}

type ServerMember = {
  server_id: string
  nickname: string | null
  servers: {
    name: string
  } | null
}

const PRESET_COLORS = [
  '#ffffff', '#a855f7', '#6366f1', '#3b82f6',
  '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#f97316', '#84cc16', '#14b8a6',
]

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const { setTheme: applyTheme } = useTheme()

  const [username, setUsername] = useState('')
  const [nicknameColor, setNicknameColor] = useState('#ffffff')
  const [theme, setTheme] = useState('dark')
  const [bio, setBio] = useState('') 
  
  const [dmBgUrl, setDmBgUrl] = useState<string | null>(null)
  const dmBgInputRef = useRef<HTMLInputElement>(null)
  
  const [myServers, setMyServers] = useState<ServerMember[]>([])
  const [selectedServerId, setSelectedServerId] = useState<string>('')
  const [nickname, setNickname] = useState('')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'security'>('profile')

  useEffect(() => {
    fetchProfileAndServers()
  }, [])

  const fetchProfileAndServers = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    //Agregado dm_bg_url al select
    const { data: profileData } = await supabase
      .from('profiles')
      .select('username, nickname_color, theme, bio, dm_bg_url')
      .eq('id', user.id)
      .single()

    if (profileData) {
      setUsername(profileData.username)
      setNicknameColor(profileData.nickname_color ?? '#ffffff')
      setTheme(profileData.theme ?? 'dark')
      setBio(profileData.bio ?? '')
      // NUEVO: Seteamos el estado del fondo de DMs
      setDmBgUrl(profileData.dm_bg_url ?? null)
    }

    const { data: serversData } = await supabase
      .from('members')
      .select(`
        server_id,
        nickname,
        servers ( name )
      `)
      .eq('user_id', user.id)

    if (serversData && serversData.length > 0) {
      const formatted: ServerMember[] = serversData.map((s: any) => ({
        server_id: s.server_id,
        nickname: s.nickname,
        servers: Array.isArray(s.servers) ? s.servers[0] : s.servers
      }))

      setMyServers(formatted)
      setSelectedServerId(formatted[0].server_id)
      setNickname(formatted[0].nickname ?? '')
    }
  }

  // Handler de subida del fondo de DMs
  const handleDmBgChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 8 * 1024 * 1024) { 
      alert('Máximo 8MB')
      return 
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const ext = file.name.split('.').pop()
    const path = `${user.id}/dm-bg-${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from('backgrounds')
      .upload(path, file, { upsert: true })

    if (!error) {
      const { data: { publicUrl } } = supabase.storage
        .from('backgrounds')
        .getPublicUrl(path)
      
      setDmBgUrl(publicUrl)
    }

    if (dmBgInputRef.current) dmBgInputRef.current.value = ''
  }

  const handleServerChange = (serverId: string) => {
    setSelectedServerId(serverId)
    const target = myServers.find(s => s.server_id === serverId)
    setNickname(target?.nickname ?? '')
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    setSuccessMsg(null)
    setErrorMsg(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    //dm_bg_url al update
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        username, 
        nickname_color: nicknameColor, 
        theme, 
        bio: bio.trim(),
        dm_bg_url: dmBgUrl 
      })
      .eq('id', user.id)

    if (profileError) {
      setErrorMsg(profileError.message)
      setSaving(false)
      return
    }

    if (selectedServerId) {
      const currentNicknameValue = nickname.trim() || null

      const { error: nicknameError } = await supabase
        .from('members')
        .upsert({ 
          server_id: selectedServerId,
          user_id: user.id,
          nickname: currentNicknameValue 
        }, {
          onConflict: 'user_id,server_id'
        })

      if (nicknameError) {
        setErrorMsg(nicknameError.message)
        setSaving(false)
        return
      }

      setMyServers(prev => prev.map(s => 
        s.server_id === selectedServerId ? { ...s, nickname: currentNicknameValue } : s
      ))
    }

    applyTheme(theme)
    setSuccessMsg('Cambios guardados correctamente')
    setSaving(false)
  }

  const handleChangePassword = async () => {
    setErrorMsg(null)
    setSuccessMsg(null)

    if (newPassword !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden')
      return
    }

    if (newPassword.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setSavingPassword(true)

    try {
      await supabase.auth.refreshSession()
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) {
        setErrorMsg(error.message)
      } else {
        setSuccessMsg('Contraseña actualizada correctamente')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      setErrorMsg('Error inesperado, intentá de nuevo')
    }

    setSavingPassword(false)
  }

  const tabs = [
    { id: 'profile', label: 'Perfil' },
    { id: 'appearance', label: 'Apariencia' },
    { id: 'security', label: 'Seguridad' },
  ] as const

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto py-10 px-4">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">Ajustes</h1>
        </div>

        <div className="flex gap-1 mb-8 bg-gray-800 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setSuccessMsg(null)
                setErrorMsg(null)
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {successMsg && (
          <div className="bg-green-500/20 border border-green-500/50 text-green-400 text-sm px-4 py-2 rounded mb-6">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 text-sm px-4 py-2 rounded mb-6">
            {errorMsg}
          </div>
        )}

        {/* Tab: Perfil */}
        {activeTab === 'profile' && (
          <div className="bg-gray-800 rounded-lg p-6 flex flex-col gap-6">
            {/* Nombre de usuario */}
            <div>
              <label className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-1 block">
                Nombre de usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-gray-900 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>

            {/* Descripción de Perfil (Bio) */}
            <div>
              <label className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-1 block">
                Descripción de perfil (Bio)
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Contanos un poco sobre vos..."
                rows={3}
                maxLength={160}
                className="w-full bg-gray-900 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm resize-none"
              />
            </div>

            {/* Apodos por Servidor */}
            {myServers.length > 0 && (
              <div className="border-t border-gray-700/50 pt-4 flex flex-col gap-4">
                <h3 className="text-sm font-semibold text-gray-200">Apodos del Servidor</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Seleccionar servidor</label>
                    <select
                      value={selectedServerId}
                      onChange={(e) => handleServerChange(e.target.value)}
                      className="w-full bg-gray-900 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm h-9"
                    >
                      {myServers.map((s) => (
                        <option key={s.server_id} value={s.server_id}>
                          {s.servers?.name || 'Servidor Desconocido'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Apodo local</label>
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder={username}
                      className="w-full bg-gray-900 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm h-9"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Vista previa con Apodo prioritario */}
            <div>
              <label className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-2 block">
                Vista previa en chat
              </label>
              <div className="bg-gray-900 rounded p-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold">
                  {(nickname || username).slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium" style={{ color: nicknameColor }}>
                    {nickname || username || 'Usuario'}
                  </span>
                  {bio && <span className="text-xs text-gray-400 truncate max-w-100">{bio}</span>}
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2 rounded transition-colors text-sm font-medium"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        )}

        {/* Tab: Apariencia */}
        {activeTab === 'appearance' && (
          <div className="bg-gray-800 rounded-lg p-6 flex flex-col gap-6">
            <div>
              <label className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-3 block">
                Color del nickname
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNicknameColor(color)}
                    className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                      nicknameColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800 scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={nicknameColor}
                  onChange={(e) => setNicknameColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={nicknameColor}
                  onChange={(e) => setNicknameColor(e.target.value)}
                  className="bg-gray-900 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm w-32"
                />
                <span className="text-sm font-medium" style={{ color: nicknameColor }}>
                  Vista previa
                </span>
              </div>
            </div>

            <div>
              <label className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-3 block">
                Tema
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex-1 py-3 px-4 rounded border text-sm font-medium transition-colors ${
                    theme === 'dark'
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  🌙 Oscuro
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={`flex-1 py-3 px-4 rounded border text-sm font-medium transition-colors ${
                    theme === 'light'
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  ☀️ Claro
                </button>
              </div>
            </div>

            {/*Contenedor para el Fondo de DMs */}
            <div>
              <label className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-2 block">
                Fondo de mensajes directos
              </label>
              <div
                className="relative h-24 rounded-lg cursor-pointer group overflow-hidden border border-gray-700"
                style={{
                  backgroundColor: '#374151',
                  backgroundImage: dmBgUrl ? `url(${dmBgUrl})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
                onClick={() => dmBgInputRef.current?.click()}
              >
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera size={20} className="text-white" />
                </div>
                <input
                  ref={dmBgInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleDmBgChange}
                  className="hidden"
                />
              </div>
              {dmBgUrl && (
                <button
                  onClick={() => setDmBgUrl(null)}
                  className="text-xs text-red-400 hover:text-red-300 mt-1 transition-colors"
                >
                  Quitar fondo
                </button>
              )}
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2 rounded transition-colors text-sm font-medium"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        )}

        {/* Tab: Seguridad */}
        {activeTab === 'security' && (
          <div className="bg-gray-800 rounded-lg p-6 flex flex-col gap-4">
            <div>
              <label className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-1 block">
                Nueva contraseña
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-gray-900 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-1 block">
                Confirmar contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                className="w-full bg-gray-900 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>

            <button
              onClick={handleChangePassword}
              disabled={savingPassword || !newPassword || !confirmPassword}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2 rounded transition-colors text-sm font-medium mt-2"
            >
              {savingPassword ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {savingPassword ? 'Actualizando...' : 'Cambiar contraseña'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}