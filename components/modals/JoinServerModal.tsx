'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

export default function JoinServerModal({
  onClose,
}: {
  onClose: () => void
}) {
  const router = useRouter()
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleJoin = async () => {
    if (!inviteCode.trim()) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/servers/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: inviteCode.trim() }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error)
      setLoading(false)
      return
    }

    onClose()
    router.push(`/servers/${data.server_id}`)
    router.refresh()
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

        <h2 className="text-white text-xl font-bold mb-1">Unirse a un servidor</h2>
        <p className="text-gray-400 text-sm mb-6">
          Ingresá el código de invitación para unirte a un servidor.
        </p>

        {error && (
          <div className="bg-red-500/20 text-red-400 text-sm px-3 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-1 block">
            Código de invitación
          </label>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            placeholder="ej: a1b2c3d4"
            className="w-full bg-gray-900 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm"
            autoFocus
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
            onClick={handleJoin}
            disabled={loading || !inviteCode.trim()}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded transition-colors"
          >
            {loading ? 'Uniéndose...' : 'Unirse'}
          </button>
        </div>
      </div>
    </div>
  )
}