'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import StatusIndicator from '@/components/ui/StatusIndicator'

type DMContact = {
  id: string
  username: string
  avatar_url: string | null
  status: string
  nickname_color: string | null
  lastMessage?: string
}

export default function DMList() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const [contacts, setContacts] = useState<DMContact[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)
      fetchContacts(user.id)
    }
    init()
  }, [])

  const fetchContacts = async (userId: string) => {
    // Traer todos los usuarios con los que tiene DMs
    const { data } = await supabase
      .from('direct_messages')
      .select(`
        sender_id,
        receiver_id,
        sender:profiles!direct_messages_sender_id_fkey (
          id, username, avatar_url, status, nickname_color
        ),
        receiver:profiles!direct_messages_receiver_id_fkey (
          id, username, avatar_url, status, nickname_color
        )
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (!data) return

    // Deduplicar contactos
    const seen = new Set<string>()
    const list: DMContact[] = []

    for (const dm of data) {
      const contact = dm.sender_id === userId ? dm.receiver : dm.sender
      if (!contact || seen.has((contact as any).id)) continue
      seen.add((contact as any).id)
      list.push(contact as any)
    }

    setContacts(list)
  }

  const activeUserId = params?.userId as string

  return (
    <div className="flex flex-col">
      <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
        Mensajes privados
      </p>
      <div className="flex flex-col gap-0.5 px-2">
        {contacts.map((contact) => (
          <button
            key={contact.id}
            onClick={() => router.push(`/home/dm/${contact.id}`)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
              activeUserId === contact.id
                ? 'bg-gray-600 text-white'
                : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
          >
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full overflow-hidden">
                {contact.avatar_url ? (
                  <Image
                    src={contact.avatar_url}
                    alt={contact.username}
                    width={32}
                    height={32}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                    {contact.username.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 border-2 border-gray-800 rounded-full">
                <StatusIndicator
                  userId={contact.id}
                  initialStatus={contact.status as any}
                  size="sm"
                />
              </div>
            </div>
            <span className="truncate" style={{ color: contact.nickname_color ?? undefined }}>
              {contact.username}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}