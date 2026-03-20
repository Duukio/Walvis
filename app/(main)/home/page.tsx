'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, Check, X, UserMinus, Users, Clock,MessageCircle } from 'lucide-react'
import Image from 'next/image'
import StatusIndicator from '@/components/ui/StatusIndicator'
import { useRouter } from 'next/navigation'

type Friendship = {
  id: string
  status: 'pending' | 'accepted' | 'rejected'
  sender_id: string
  receiver_id: string
  sender: {
    id: string
    username: string
    avatar_url: string | null
    status: string
    nickname_color: string | null
  }
  receiver: {
    id: string
    username: string
    avatar_url: string | null
    status: string
    nickname_color: string | null
  }
}

type Tab = 'all' | 'pending' | 'add'

export default function HomePage() {
  const supabase = createClient()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [friendships, setFriendships] = useState<Friendship[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [addUsername, setAddUsername] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [addSuccess, setAddSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)
      fetchFriendships(user.id)
    }
    init()
  }, [])

  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase
      .channel(`friendships:${currentUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        () => fetchFriendships(currentUserId)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUserId])

  const fetchFriendships = async (userId: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('friendships')
      .select(`
        id,
        status,
        sender_id,
        receiver_id,
        sender:profiles!friendships_sender_id_fkey (
          id, username, avatar_url, status, nickname_color
        ),
        receiver:profiles!friendships_receiver_id_fkey (
          id, username, avatar_url, status, nickname_color
        )
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (data) setFriendships(data as unknown as Friendship[])
    setLoading(false)
  }

  const handleAddFriend = async () => {
    if (!addUsername.trim()) return
    setAddLoading(true)
    setAddError(null)
    setAddSuccess(null)

    const res = await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: addUsername.trim() }),
    })

    const data = await res.json()
    if (!res.ok) {
      setAddError(data.error)
    } else {
      setAddSuccess(`Solicitud enviada a ${addUsername}`)
      setAddUsername('')
    }
    setAddLoading(false)
  }

  const handleAccept = async (friendshipId: string) => {
    await fetch(`/api/friends/${friendshipId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'accepted' }),
    })
    if (currentUserId) fetchFriendships(currentUserId)
  }

  const handleReject = async (friendshipId: string) => {
    await fetch(`/api/friends/${friendshipId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected' }),
    })
    if (currentUserId) fetchFriendships(currentUserId)
  }

  const handleRemove = async (friendshipId: string) => {
    await fetch(`/api/friends/${friendshipId}`, { method: 'DELETE' })
    if (currentUserId) fetchFriendships(currentUserId)
  }

  const getFriend = (f: Friendship) =>
    f.sender_id === currentUserId ? f.receiver : f.sender

  const acceptedFriends = friendships.filter(f => f.status === 'accepted')
  const pendingReceived = friendships.filter(
    f => f.status === 'pending' && f.receiver_id === currentUserId
  )
  const pendingSent = friendships.filter(
    f => f.status === 'pending' && f.sender_id === currentUserId
  )

  const tabs = [
    { id: 'all' as Tab, label: 'Todos', icon: <Users size={14} />, count: acceptedFriends.length },
    { id: 'pending' as Tab, label: 'Pendientes', icon: <Clock size={14} />, count: pendingReceived.length },
    { id: 'add' as Tab, label: 'Agregar', icon: <UserPlus size={14} /> },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-700">
      {/* Header */}
      <div className="h-12 px-4 flex items-center gap-4 border-b border-gray-600 bg-gray-700 shrink-0">
        <Users size={18} className="text-gray-400" />
        <span className="text-white font-semibold text-sm">Amigos</span>

        <div className="w-px h-5 bg-gray-600" />

        {/* Tabs */}
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-gray-600 text-white'
                  : 'text-gray-400 hover:bg-gray-600/50 hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  tab.id === 'pending' ? 'bg-red-500 text-white' : 'bg-gray-500 text-white'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* Tab: Agregar amigo */}
        {activeTab === 'add' && (
          <div className="max-w-lg">
            <h2 className="text-white font-semibold mb-1">Agregar amigo</h2>
            <p className="text-gray-400 text-sm mb-4">
              Podés agregar amigos con su nombre de usuario.
            </p>

            {addError && (
              <div className="bg-red-500/20 text-red-400 text-sm px-4 py-2 rounded mb-3">
                {addError}
              </div>
            )}
            {addSuccess && (
              <div className="bg-green-500/20 text-green-400 text-sm px-4 py-2 rounded mb-3">
                {addSuccess}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={addUsername}
                onChange={(e) => setAddUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
                placeholder="Nombre de usuario"
                className="flex-1 bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
                autoFocus
              />
              <button
                onClick={handleAddFriend}
                disabled={addLoading || !addUsername.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded transition-colors font-medium"
              >
                {addLoading ? 'Enviando...' : 'Enviar solicitud'}
              </button>
            </div>
          </div>
        )}

        {/* Tab: Pendientes */}
        {activeTab === 'pending' && (
          <div className="max-w-lg flex flex-col gap-4">
            {pendingReceived.length > 0 && (
              <div>
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">
                  Solicitudes recibidas — {pendingReceived.length}
                </p>
                <div className="flex flex-col gap-2">
                  {pendingReceived.map((f) => {
                    const friend = getFriend(f)
                    return (
                      <div key={f.id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden">
                            {friend.avatar_url ? (
                              <Image src={friend.avatar_url} alt={friend.username} width={40} height={40} className="object-cover w-full h-full" />
                            ) : (
                              <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white">
                                {friend.username.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 border-2 border-gray-800 rounded-full">
                            <StatusIndicator userId={friend.id} initialStatus={friend.status as any} />
                          </div>
                        </div>
                        <span className="flex-1 text-white text-sm font-medium" style={{ color: friend.nickname_color ?? undefined }}>
                          {friend.username}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAccept(f.id)}
                            className="w-8 h-8 rounded-full bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-white flex items-center justify-center transition-colors"
                            title="Aceptar"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => handleReject(f.id)}
                            className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white flex items-center justify-center transition-colors"
                            title="Rechazar"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {pendingSent.length > 0 && (
              <div>
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">
                  Solicitudes enviadas — {pendingSent.length}
                </p>
                <div className="flex flex-col gap-2">
                  {pendingSent.map((f) => {
                    const friend = getFriend(f)
                    return (
                      <div key={f.id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                          {friend.avatar_url ? (
                            <Image src={friend.avatar_url} alt={friend.username} width={40} height={40} className="object-cover w-full h-full" />
                          ) : (
                            <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white">
                              {friend.username.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="flex-1 text-white text-sm font-medium">
                          {friend.username}
                        </span>
                        <span className="text-gray-400 text-xs">Pendiente</span>
                        <button
                          onClick={() => handleRemove(f.id)}
                          className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white flex items-center justify-center transition-colors"
                          title="Cancelar solicitud"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {pendingReceived.length === 0 && pendingSent.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-12">
                No tenés solicitudes pendientes
              </div>
            )}
          </div>
        )}

        {/* Tab: Todos los amigos */}
        {activeTab === 'all' && (
          <div className="max-w-lg">
            {loading ? (
              <div className="text-center text-gray-400 text-sm py-12">Cargando...</div>
            ) : acceptedFriends.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <Users size={48} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">No tenés amigos todavía</p>
                <p className="text-sm mt-1">Agregá amigos con su nombre de usuario</p>
                <button
                  onClick={() => setActiveTab('add')}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded transition-colors"
                >
                  Agregar amigo
                </button>
              </div>
            ) : (
              <div>
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">
                  Amigos — {acceptedFriends.length}
                </p>
                <div className="flex flex-col gap-1">
                  {acceptedFriends.map((f) => {
                    const friend = getFriend(f)
                    return (
                      <div
                        key={f.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 transition-colors group"
                      >
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden">
                            {friend.avatar_url ? (
                              <Image src={friend.avatar_url} alt={friend.username} width={40} height={40} className="object-cover w-full h-full" />
                            ) : (
                              <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white">
                                {friend.username.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 border-2 border-gray-700 rounded-full">
                            <StatusIndicator userId={friend.id} initialStatus={friend.status as any} />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: friend.nickname_color ?? '#ffffff' }}>
                            {friend.username}
                          </p>
                          <p className="text-xs text-gray-400 capitalize">{friend.status}</p>
                        </div> 
                        <button onClick={() => router.push(`/home/dm/${friend.id}`)} 
                        className="p-1.5 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Mensaje directo">
                        <MessageCircle size={16} />
</button>
                        

                        <button
                          onClick={() => handleRemove(f.id)}
                          className="w-8 h-8 rounded-full text-gray-400 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                          title="Eliminar amigo"
                        >
                          <UserMinus size={16} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}