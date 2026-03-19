'use client'

import { useEffect, useState } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Compass, MessageCircle } from 'lucide-react'
import Image from 'next/image'
import CreateServerModal from '@/components/modals/CreateServerModal'
import JoinServerModal from '@/components/modals/JoinServerModal'


type Server = {
  id: string
  name: string
  icon_url: string | null
}

export default function ServerList() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const [servers, setServers] = useState<Server[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    fetchServers()

    const handler = () => fetchServers()
    window.addEventListener('server-updated', handler)
    return () => window.removeEventListener('server-updated', handler)
  }, [])

  const fetchServers = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('members')
      .select('servers(id, name, icon_url)')
      .eq('user_id', user.id)

    if (data) {
      const list = data
        .map((m: any) => m.servers)
        .filter(Boolean) as Server[]
      setServers(list)
    }
  }

  return (
    <>
    <aside className="w-[72px] bg-gray-900 flex flex-col items-center py-3 gap-2 overflow-y-auto shrink-0">
      {/* Botón Home */}
      <button
      onClick={() => router.push('/home')}
      title="Amigos"
      className={`relative w-12 h-12 transition-all duration-200 ${
        pathname === '/home' ? 'rounded-2xl' : 'rounded-full hover:rounded-2xl'
      }`}
      >
        {pathname === '/home' && (
          <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-white rounded-r-full" />
          )}
          <div className={`w-full h-full flex items-center justify-center rounded-[inherit] ${
            pathname === '/home'
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-indigo-600 hover:text-white'
            }`}>
              <MessageCircle size={20} />
              </div>
              </button>

  {/* Separador */}
  <div className="w-8 h-px bg-gray-700" />
  {servers.map((server) => (
    <ServerIcon
      key={server.id}
      server={server}
      active={params?.serverId === server.id}
      onClick={() => router.push(`/servers/${server.id}`)}
    />
  ))}

  <div className="w-8 h-px bg-gray-700 my-1" />

  <button
    onClick={() => setShowCreate(true)}
    className="w-12 h-12 rounded-full bg-gray-700 hover:bg-green-600 hover:rounded-2xl flex items-center justify-center transition-all duration-200 text-green-400 hover:text-white"
    title="Crear servidor"
  >
    <Plus size={20} />
  </button>

  <button
    onClick={() => setShowJoin(true)}
    className="w-12 h-12 rounded-full bg-gray-700 hover:bg-indigo-600 hover:rounded-2xl flex items-center justify-center transition-all duration-200 text-indigo-400 hover:text-white"
    title="Unirse a un servidor"
  >
    <Compass size={20} />
  </button>
</aside>

      {showCreate && (
        <CreateServerModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            fetchServers()
          }}
        />
      )}

      {showJoin && (
        <JoinServerModal
          onClose={() => setShowJoin(false)}
        />
      )}
    </>
  )
}

function ServerIcon({
  server,
  active,
  onClick,
}: {
  server: Server
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={server.name}
      className={`relative w-12 h-12 transition-all duration-200 ${
        active ? 'rounded-2xl' : 'rounded-full hover:rounded-2xl'
      }`}
    >
      {active && (
        <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-white rounded-r-full" />
      )}

      {server.icon_url ? (
        <Image
          src={server.icon_url}
          alt={server.name}
          width={48}
          height={48}
          className="rounded-[inherit] object-cover"
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center text-sm font-bold rounded-[inherit] ${
            active
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-indigo-600 hover:text-white'
          }`}
        >
          {server.name.slice(0, 2).toUpperCase()}
        </div>
      )}
    </button>
  )
}