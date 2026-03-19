'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

export default function CreateServerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
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

        <h2 className="text-white text-xl font-bold mb-1">Crear un servidor</h2>
        <p className="text-gray-400 text-sm mb-6">
          Dale un nombre a tu nuevo servidor.
        </p>

        {error && (
          <div className="bg-red-500/20 text-red-400 text-sm px-3 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-1 block">
            Nombre del servidor
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Mi servidor"
            className="w-full bg-gray-900 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-indigo-500"
          />
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
            {loading ? 'Creando...' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  )
}