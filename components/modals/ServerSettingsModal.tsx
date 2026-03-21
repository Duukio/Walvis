'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { X, Camera, Save, Trash2, Shield, UserMinus, Ban, Loader2, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import RolesEditor from '@/components/modals/RolesEditor'

type Member = {
  user_id: string
  role: string
  profiles: {
    username: string
    avatar_url: string | null
    nickname_color: string | null
  }
}

type Server = {
  id: string
  name: string
  icon_url: string | null
  owner_id: string
  invite_code: string | null
  chat_bg_url: string | null
}

type Role = {
  id: string
  name: string
  color: string | null
  position: number
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Propietario',
  admin: 'Admin',
  member: 'Miembro',
}

export default function ServerSettingsModal({
  serverId,
  onClose,
}: {
  serverId: string
  onClose: () => void
}) {
  const supabase = createClient()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [server, setServer] = useState<Server | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')

  const [name, setName] = useState('')
  const [iconUrl, setIconUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'roles'>('general')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteName, setDeleteName] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [serverRoles, setServerRoles] = useState<any[]>([])
  const [memberRoles, setMemberRoles] = useState<Record<string, string[]>>({})

  useEffect(() => {
    fetchData()
  }, [serverId])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUserId(user.id)

const { data: rolesData } = await supabase
  .from('roles')
  .select('id, name, color, position')  
  .eq('server_id', serverId)
  .order('position', { ascending: false })

if (rolesData) setServerRoles(rolesData)

const { data: memberRolesData } = await supabase
  .from('member_roles')
  .select('user_id, role_id')
  .eq('server_id', serverId)

if (memberRolesData) {
  const map: Record<string, string[]> = {}
  for (const mr of memberRolesData) {
    if (!map[mr.user_id]) map[mr.user_id] = []
    map[mr.user_id].push(mr.role_id)
  }
  setMemberRoles(map)
}

    const { data: serverData } = await supabase
      .from('servers')
      .select('id, name, icon_url, owner_id, invite_code, chat_bg_url')
      .eq('id', serverId)
      .single()

    if (serverData) {
      setServer(serverData)
      setName(serverData.name)
      setIconUrl(serverData.icon_url)
    }

    const { data: membersData } = await supabase
      .from('members')
      .select(`
        user_id,
        role,
        profiles (
          username,
          avatar_url,
          nickname_color
        )
      `)
      .eq('server_id', serverId)

    if (membersData) {
      setMembers(membersData as unknown as Member[])
      const me = membersData.find(m => m.user_id === user.id)
      setCurrentUserRole(me?.role ?? '')
    }
  }

  const handleIconChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentUserId) return

    if (file.size > 2 * 1024 * 1024) { alert('Máximo 2MB'); return }
    if (!file.type.startsWith('image/')) { alert('Solo imágenes'); return }

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${serverId}/icon.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      setIconUrl(publicUrl)
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

const handleSave = async () => {
  if (!name.trim()) return
  setSaving(true)
  setError(null)
  setSuccess(null)

  const res = await fetch(`/api/servers/${serverId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name.trim(), icon_url: iconUrl }),
  })

  const data = await res.json()
  if (!res.ok) {
    setError(data.error)
  } else {
    setSuccess('Cambios guardados')
    // Notificar al ServerList que se actualizó
    window.dispatchEvent(new CustomEvent('server-updated'))
  }
  setSaving(false)
}

  const handleDelete = async () => {
    if (deleteName !== server?.name) {
      setError('El nombre no coincide')
      return
    }

    const res = await fetch(`/api/servers/${serverId}`, { method: 'DELETE' })
    if (res.ok) {
      onClose()
      router.push('/home')
      router.refresh()
    }
  }

  const handleKick = async (memberId: string) => {
    setActionLoading(memberId)
    await fetch(`/api/servers/${serverId}/members/${memberId}`, { method: 'DELETE' })
    await fetchData()
    setActionLoading(null)
  }

  const handleBan = async (memberId: string) => {
    setActionLoading(`ban-${memberId}`)
    await fetch(`/api/servers/${serverId}/ban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: memberId }),
    })
    await fetchData()
    setActionLoading(null)
  }

  const handleRoleChange = async (memberId: string, role: string) => {
    setActionLoading(`role-${memberId}`)
    await fetch(`/api/servers/${serverId}/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    await fetchData()
    setActionLoading(null)
  }

  const addRoleToMember = async (memberId: string, roleId: string) => {
  await fetch(`/api/servers/${serverId}/members/${memberId}/roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role_id: roleId }),
  })
  setMemberRoles(prev => ({
    ...prev,
    [memberId]: [...(prev[memberId] ?? []), roleId],
  }))
}

const removeRoleFromMember = async (memberId: string, roleId: string) => {
  await fetch(`/api/servers/${serverId}/members/${memberId}/roles`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role_id: roleId }),
  })
  setMemberRoles(prev => ({
    ...prev,
    [memberId]: (prev[memberId] ?? []).filter(id => id !== roleId),
  }))
}

  const canManage = ['owner', 'admin'].includes(currentUserRole)

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'members', label: `Miembros (${members.length})` },
    { id: 'roles', label: 'Roles' },
  ] as const

  const chatBgInputRef = useRef<HTMLInputElement>(null)

const handleChatBgChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file || !currentUserId) return

  if (file.size > 5 * 1024 * 1024) { alert('Máximo 5MB'); return }
  if (!file.type.startsWith('image/')) { alert('Solo imágenes'); return }

  setUploading(true)
 const ext = file.name.split('.').pop()
 const path = `${serverId}/chat-bg-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('backgrounds')
    .upload(path, file, { upsert: true })

  if (!uploadError) {
    const { data: { publicUrl } } = supabase.storage
      .from('backgrounds')
      .getPublicUrl(path)

    const res = await fetch(`/api/servers/${serverId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, icon_url: iconUrl, chat_bg_url: publicUrl }),
    })

    if (res.ok) {
      setServer(prev => prev ? { ...prev, chat_bg_url: publicUrl } : prev)
      setSuccess('Fondo actualizado')
    }
  }

  setUploading(false)
  if (chatBgInputRef.current) chatBgInputRef.current.value = ''
}

  
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl w-full max-w-xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-white font-bold text-lg">Ajustes del servidor</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setError(null); setSuccess(null) }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Mensajes */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-400 text-sm px-4 py-2 rounded mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-500/20 border border-green-500/50 text-green-400 text-sm px-4 py-2 rounded mb-4">
              {success}
            </div>
          )}

          {/* Tab General */}
          {activeTab === 'general' && (
            <div className="flex flex-col gap-6">
              {/* Icono */}
              <div className="flex items-center gap-4">
                <div
                  className="relative w-20 h-20 rounded-full overflow-hidden cursor-pointer group shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {iconUrl ? (
                    <Image src={iconUrl} alt="Icono" width={80} height={80} className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-2xl font-bold text-white">
                      {name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploading
                      ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Camera size={20} className="text-white" />
                    }
                  </div>
                </div>
                <div className="text-sm text-gray-400">
                  <p className="font-medium text-white mb-1">Icono del servidor</p>
                  <p>Recomendado: 512x512px</p>
                  <p>Máximo: 2MB</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleIconChange} className="hidden" />
              </div>

              {/* Nombre */}
              <div>
                <label className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-1 block">
                  Nombre del servidor
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-900 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              {server && (
                <div>
                  <label className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-1 block">
                    Código de invitación
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                      type="text"
                      readOnly
                      value={server.invite_code ?? ''}
                      className="flex-1 bg-gray-900 text-white px-3 py-2 rounded border border-gray-700 text-sm"
                      />
                      <button
                      onClick={() => {
                        navigator.clipboard.writeText(server.invite_code ?? '')
                        setSuccess('Código copiado!')
                      }}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
                      >
                        Copiar
                        </button>
                        </div>
                        </div>
    )}

    {/* Fondo del chat */}
<div>
  <label className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-2 block">
    Fondo del chat
  </label>
  <div
    className="relative h-24 rounded-lg cursor-pointer group overflow-hidden border border-gray-700"
    style={{
      backgroundColor: '#374151',
      backgroundImage: server?.chat_bg_url ? `url(${server.chat_bg_url})` : undefined,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}
    onClick={() => chatBgInputRef.current?.click()}
  >
    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
      <Camera size={20} className="text-white" />
    </div>
    <input
      ref={chatBgInputRef}
      type="file"
      accept="image/*"
      onChange={handleChatBgChange}
      className="hidden"
    />
  </div>
  {server?.chat_bg_url && (
    <button
      onClick={async () => {
        await fetch(`/api/servers/${serverId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, icon_url: iconUrl, chat_bg_url: null }),
        })
        setServer(prev => prev ? { ...prev, chat_bg_url: null } : prev)
      }}
      className="text-xs text-red-400 hover:text-red-300 mt-1 transition-colors"
    >
      Quitar fondo
    </button>
  )}
</div>

              {canManage && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2 rounded transition-colors text-sm font-medium"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              )}

              {/* Zona de peligro */}
              {currentUserRole === 'owner' && (
                <div className="border border-red-500/30 rounded-lg p-4 mt-2">
                  <p className="text-red-400 font-semibold text-sm mb-2">Zona de peligro</p>
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded text-sm transition-colors"
                    >
                      <Trash2 size={16} />
                      Eliminar servidor
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="text-gray-300 text-sm">
                        Escribí <span className="font-bold text-white">{server?.name}</span> para confirmar:
                      </p>
                      <input
                        type="text"
                        value={deleteName}
                        onChange={(e) => setDeleteName(e.target.value)}
                        className="w-full bg-gray-900 text-white px-3 py-2 rounded border border-red-500/50 focus:outline-none text-sm"
                        placeholder={server?.name}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleDelete}
                          disabled={deleteName !== server?.name}
                          className="flex-1 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white py-2 rounded text-sm font-medium transition-colors"
                        >
                          Eliminar permanentemente
                        </button>
                        <button
                          onClick={() => { setShowDeleteConfirm(false); setDeleteName('') }}
                          className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab Miembros */}
          {/* Tab Miembros */}
{activeTab === 'members' && (
  <div className="flex flex-col gap-3">
    {members.map((member) => {
      const isMe = member.user_id === currentUserId
      const isOwner = member.role === 'owner'
      const canAct = canManage && !isMe && !isOwner

      return (
        <div
          key={member.user_id}
          className="flex flex-col gap-2 px-3 py-2 rounded bg-gray-700/50"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
              {member.profiles.avatar_url ? (
                <Image src={member.profiles.avatar_url} alt={member.profiles.username} width={32} height={32} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                  {member.profiles.username.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <span className="flex-1 text-sm font-medium truncate" style={{ color: member.profiles.nickname_color ?? '#ffffff' }}>
              {member.profiles.username}
              {isMe && <span className="text-gray-400 ml-1">(tú)</span>}
            </span>

            {canAct ? (
              <select
                value={member.role}
                onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded border border-gray-600"
              >
                <option value="member">Miembro</option>
                <option value="admin">Admin</option>
              </select>
            ) : (
              <span className="text-xs px-2 py-1 rounded bg-gray-600/50 text-gray-400">
                {member.role}
              </span>
            )}

            {canAct && (
              <div className="flex items-center gap-1">
                <button onClick={() => handleKick(member.user_id)} className="p-1.5 text-gray-400 hover:text-yellow-400">
                  <UserMinus size={14} />
                </button>
                <button onClick={() => handleBan(member.user_id)} className="p-1.5 text-gray-400 hover:text-red-400">
                  <Ban size={14} />
                </button>
              </div>
            )}
          </div>

          {serverRoles.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {serverRoles.map((role) => {
                const hasRole = memberRoles[member.user_id]?.includes(role.id)
                return (
                  <button
                    key={role.id}
                    onClick={() => hasRole ? removeRoleFromMember(member.user_id, role.id) : addRoleToMember(member.user_id, role.id)}
                    className={`text-xs px-2 py-0.5 rounded-full border ${hasRole ? 'text-white' : 'border-gray-600 text-gray-400'}`}
                    style={hasRole ? { backgroundColor: role.color } : {}}
                  >
                    {role.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )
    })}
  </div>
)}

{/* Tab Roles */}
{activeTab === 'roles' && (
  <RolesEditor serverId={serverId} />
)}

        </div>
      </div>
    </div>
  )
}