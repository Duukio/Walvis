'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Save } from 'lucide-react'

type Permission = {
  view_channels: boolean
  send_messages: boolean
  manage_channels: boolean
  manage_members: boolean
  mention_everyone: boolean
}

type Role = {
  id: string
  name: string
  color: string
  position: number
  permissions: Permission
}

const DEFAULT_PERMISSIONS: Permission = {
  view_channels: true,
  send_messages: true,
  manage_channels: false,
  manage_members: false,
  mention_everyone: false,
}

const PERMISSION_LABELS: Record<keyof Permission, string> = {
  view_channels: 'Ver canales',
  send_messages: 'Enviar mensajes',
  manage_channels: 'Gestionar canales',
  manage_members: 'Gestionar miembros',
  mention_everyone: 'Mencionar @everyone',
}

export default function RolesEditor({ serverId }: { serverId: string }) {
  const [roles, setRoles] = useState<Role[]>([])
  const [selected, setSelected] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    setLoading(true)
    const res = await fetch(`/api/servers/${serverId}/roles`)
    const data = await res.json()
    if (data.roles) {
      setRoles(data.roles)
      if (data.roles.length > 0) setSelected(data.roles[0])
    }
    setLoading(false)
  }

  const handleCreate = async () => {
    const res = await fetch(`/api/servers/${serverId}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Nuevo rol',
        color: '#99aab5',
        permissions: DEFAULT_PERMISSIONS,
      }),
    })
    const data = await res.json()
    if (data.role) {
      setRoles(prev => [data.role, ...prev])
      setSelected(data.role)
    }
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    const res = await fetch(`/api/servers/${serverId}/roles/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: selected.name,
        color: selected.color,
        permissions: selected.permissions,
        position: selected.position,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
    } else {
      setSuccess('Rol guardado')
      setRoles(prev => prev.map(r => r.id === selected.id ? data.role : r))
    }
    setSaving(false)
  }

  const handleDelete = async (roleId: string) => {
    await fetch(`/api/servers/${serverId}/roles/${roleId}`, { method: 'DELETE' })
    const remaining = roles.filter(r => r.id !== roleId)
    setRoles(remaining)
    setSelected(remaining[0] ?? null)
  }

  const updateSelected = (field: keyof Role, value: any) => {
    if (!selected) return
    setSelected({ ...selected, [field]: value })
  }

  const updatePermission = (perm: keyof Permission, value: boolean) => {
    if (!selected) return
    setSelected({
      ...selected,
      permissions: { ...selected.permissions, [perm]: value },
    })
  }

  return (
    <div className="flex gap-4 min-h-[300px]">
      {/* Lista de roles */}
      <div className="w-40 flex flex-col gap-1">
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-3 py-2 text-sm text-indigo-400 hover:bg-gray-700 rounded transition-colors"
        >
          <Plus size={14} />
          Crear rol
        </button>

        {loading ? (
          <p className="px-3 text-gray-400 text-sm">Cargando...</p>
        ) : roles.length === 0 ? (
          <p className="px-3 text-gray-400 text-sm">Sin roles</p>
        ) : (
          roles.map((role) => (
            <button
              key={role.id}
              onClick={() => { setSelected(role); setSuccess(null); setError(null) }}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors text-left ${
                selected?.id === role.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: role.color }} />
              <span className="truncate">{role.name}</span>
            </button>
          ))
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col gap-4">
        {!selected ? (
          <div className="text-center text-gray-400 text-sm mt-8">
            Seleccioná un rol para editarlo
          </div>
        ) : (
          <>
            {error && <div className="bg-red-500/20 text-red-400 text-sm px-3 py-2 rounded">{error}</div>}
            {success && <div className="bg-green-500/20 text-green-400 text-sm px-3 py-2 rounded">{success}</div>}

            {/* Nombre */}
            <div>
              <label className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-1 block">
                Nombre
              </label>
              <input
                type="text"
                value={selected.name}
                onChange={(e) => updateSelected('name', e.target.value)}
                className="w-full bg-gray-900 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>

            {/* Color */}
            <div>
              <label className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-2 block">
                Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={selected.color}
                  onChange={(e) => updateSelected('color', e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={selected.color}
                  onChange={(e) => updateSelected('color', e.target.value)}
                  className="bg-gray-900 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm w-28"
                />
                <span className="text-sm font-medium" style={{ color: selected.color }}>
                  {selected.name}
                </span>
              </div>
            </div>

            {/* Permisos */}
            <div>
              <label className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-2 block">
                Permisos
              </label>
              <div className="flex flex-col gap-2">
                {(Object.keys(PERMISSION_LABELS) as (keyof Permission)[]).map((perm) => (
                  <div key={perm} className="flex items-center justify-between px-3 py-2 bg-gray-700/50 rounded">
                    <span className="text-gray-200 text-sm">{PERMISSION_LABELS[perm]}</span>
                    <button
                      onClick={() => updatePermission(perm, !selected.permissions[perm])}
                      className={`w-10 h-5 rounded-full transition-colors relative ${
                        selected.permissions[perm] ? 'bg-indigo-600' : 'bg-gray-600'
                      }`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        selected.permissions[perm] ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => handleDelete(selected.id)}
                className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm transition-colors"
              >
                <Trash2 size={14} />
                Eliminar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded text-sm transition-colors"
              >
                <Save size={14} />
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}