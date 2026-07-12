'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/providers/ThemeProvider'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'

type Profile = {
  username: string
  nickname_color: string
  theme: string
  bio: string | null
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
  const [bio, setBio] = useState('') // Estado para la Bio
  
  // Estados para manejar los apodos por servidor
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

  // Carga inicial del perfil global y los servidores a los que pertenece
  const fetchProfileAndServers = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Traer perfil incluyendo la nueva columna 'bio'
    const { data: profileData } = await supabase
      .from('profiles')
      .select('username, nickname_color, theme, bio')
      .eq('id', user.id)
      .single()

    if (profileData) {
      setUsername(profileData.username)
      setNicknameColor(profileData.nickname_color ?? '#ffffff')
      setTheme(profileData.theme ?? 'dark')
      setBio(profileData.bio ?? '')
    }

    // Traer la lista de servidores donde el usuario es miembro junto con su apodo actual
    const { data: serversData } = await supabase
      .from('members')
      .select(`
        server_id,
        nickname,
        servers ( name )
      `)
      .eq('user_id', user.id)

    if (serversData && serversData.length > 0) {
      // Normalizamos el mapeo por si Supabase anida la relación como un array u objeto simple
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

  // Detecta el cambio en el select de servidores para actualizar el input del apodo
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

    // 1. Guardar cambios globales del perfil (incluye la Bio)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ username, nickname_color: nicknameColor, theme, bio: bio.trim() })
      .eq('id', user.id)

    if (profileError) {
      setErrorMsg(profileError.message)
      setSaving(false)
      return
    }

    // 2. Guardar el apodo local si hay un servidor seleccionado (Cambiado a UPSERT seguro)
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

      // Actualizar el estado local de los servidores para que refleje el cambio de inmediato
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