'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError(null)

const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
})
console.log('LOGIN DATA:', data)
console.log('LOGIN ERROR:', error)

if (error) {
  if (error.message.toLowerCase().includes('invalid')) {
    setError('Credenciales inválidas o email no confirmado')
  } else {
    setError(error.message)
  }
  setLoading(false)
  return
}

router.push('/')
router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg w-full max-w-md shadow-lg">
        <h1 className="text-white text-2xl font-bold text-center mb-2">Bienvenido de vuelta</h1>
        <p className="text-gray-400 text-center text-sm mb-6">Nos alegra verte de nuevo</p>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 text-sm px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-1 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-900 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-1 block">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full bg-gray-900 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2 rounded transition-colors"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>

          <p className="text-gray-400 text-sm text-center">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-indigo-400 hover:underline">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}