'use client'

import { useState } from 'react'
import { X, Hash, Volume2 } from 'lucide-react'

type ChannelType = 'text' | 'voice'

export default function CreateChannelModal({
  serverId,
  onClose,
  onCreated,
}: {
  serverId: string
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState<ChannelType>('text')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        server_id: serverId,
        name: name.trim().toLowerCase().replace(/\s+/g, '-'),
        type,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error)
      setLoading(false)
      return
    }

    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X size={20} />
        </button>

        <h2 className="text-white text-xl font-bold mb-1">Crear canal</h2>
        <p className="text-gray-400 text-sm mb-6">
          En el servidor seleccionado
        </p>

        {error && (
          <div className="bg-red-500/20 text-red-400 text-sm px-3 py-2 rounded mb-4">
            {error}
          </div>
        )}

        {/* Tipo de canal */}
        <div className="mb-4">
          <label className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-2 block">
            Tipo de canal
          </label>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setType('text')}
              className={`flex items-center gap-3 px-4 py-3 rounded border transition-colors ${
                type === 'text'
                  ? 'border-indigo-500 bg-indigo-500/10 text-white'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              <Hash size={18} />
              <div className="text-left">
                <p className="text-sm font-medium">Texto</p>
                <p className="text-xs text-gray-400">Enviá mensajes, archivos e imágenes</p>
              </div>
            </button>

            <button
              onClick={() => setType('voice')}
              className={`flex items-center gap-3 px-4 py-3 rounded border transition-colors ${
                type === 'voice'
                  ? 'border-indigo-500 bg-indigo-500/10 text-white'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              <Volume2 size={18} />
              <div className="text-left">
                <p className="text-sm font-medium">Voz</p>
                <p className="text-xs text-gray-400">Hablá con voz y video</p>
              </div>
            </button>
          </div>
        </div>

        {/* Nombre */}
        <div className="mb-6">
          <label className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-1 block">
            Nombre del canal
          </label>
          <div className="flex items-center bg-gray-900 rounded border border-gray-700 focus-within:border-indigo-500 px-3">
            {type === 'text' ? (
              <Hash size={16} className="text-gray-400 shrink-0 mr-1" />
            ) : (
              <Volume2 size={16} className="text-gray-400 shrink-0 mr-1" />
            )}
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="nuevo-canal"
              className="flex-1 bg-transparent text-white py-2 text-sm focus:outline-none"
            />
          </div>
          <p className="text-gray-500 text-xs mt-1">
            Los espacios se reemplazan por guiones automáticamente
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded transition-colors"
          >
            {loading ? 'Creando...' : 'Crear canal'}
          </button>
        </div>
      </div>
    </div>
  )
}