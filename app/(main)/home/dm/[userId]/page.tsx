'use client'

import { use, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Pencil, Trash2, Check, X, Paperclip, SendHorizonal, Smile } from 'lucide-react'
import Image from 'next/image'
import StatusIndicator from '@/components/ui/StatusIndicator'
import MessageInput from '@/components/chat/MessageInput'

type DM = {
  id: string
  content: string
  attachments: any[] | null
  edited: boolean
  created_at: string
  sender_id: string
  sender: {
    username: string
    avatar_url: string | null
    nickname_color: string | null
    status: string
  }
}

type Props = {
  params: Promise<{ userId: string }>
}

export default function DMPage({ params }: Props) {
  const { userId } = use(params)
  const supabase = createClient()
  const [messages, setMessages] = useState<DM[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [contact, setContact] = useState<any>(null)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)

      // Cargar perfil del contacto
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, status, nickname_color')
        .eq('id', userId)
        .single()
      if (profile) setContact(profile)

      // Cargar mensajes
      const res = await fetch(`/api/dm?receiver_id=${userId}`)
      const data = await res.json()
      if (data.messages) setMessages(data.messages)
    }
    init()
  }, [userId])

  // Realtime
  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase
      .channel(`dm:${[currentUserId, userId].sort().join('-')}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        async (payload) => {
          const msg = payload.new
          if (
            (msg.sender_id === currentUserId && msg.receiver_id === userId) ||
            (msg.sender_id === userId && msg.receiver_id === currentUserId)
          ) {
            const { data: sender } = await supabase
              .from('profiles')
              .select('username, avatar_url, nickname_color, status')
              .eq('id', msg.sender_id)
              .single()

            setMessages(prev => [...prev, { ...msg, sender } as DM])
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'direct_messages' },
        (payload) => {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUserId, userId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])



  const handleDelete = async (id: string) => {
    await supabase.from('direct_messages').delete().eq('id', id)
  }
  

  return (
    <div className="flex flex-col h-full bg-gray-700">
      {/* Header */}
      <div className="h-12 px-4 flex items-center gap-3 border-b border-gray-600 shrink-0">
        {contact && (
          <>
            <div className="relative">
              <div className="w-8 h-8 rounded-full overflow-hidden">
                {contact.avatar_url ? (
                  <Image src={contact.avatar_url} alt={contact.username} width={32} height={32} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                    {contact.username.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 border-2 border-gray-700 rounded-full">
                <StatusIndicator userId={contact.id} initialStatus={contact.status} size="sm" />
              </div>
            </div>
            <span className="text-white font-semibold text-sm" style={{ color: contact.nickname_color ?? undefined }}>
              {contact.username}
            </span>
          </>
        )}
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Empezá una conversación con {contact?.username}
          </div>
        )}
        {messages.map((msg) => (
          <DMMessage
            key={msg.id}
            message={msg}
            isOwn={msg.sender_id === currentUserId}
            onDelete={handleDelete}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div>
        <MessageInput receiverId={userId} />
        </div>
      </div>
  )
}

function DMMessage({
  message,
  isOwn,
  onDelete,
}: {
  message: DM
  isOwn: boolean
  onDelete: (id: string) => void
}) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div
      className="flex items-start gap-3 group hover:bg-gray-600/30 px-2 py-1 rounded transition-colors relative"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="relative shrink-0 mt-0.5">
        <div className="w-8 h-8 rounded-full overflow-hidden">
          {message.sender?.avatar_url ? (
            <Image src={message.sender.avatar_url} alt={message.sender.username} width={32} height={32} className="object-cover w-full h-full" />
          ) : (
            <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
              {message.sender?.username?.slice(0, 2).toUpperCase() ?? '??'}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-sm" style={{ color: message.sender?.nickname_color ?? '#ffffff' }}>
            {message.sender?.username ?? 'Desconocido'}
          </span>
          <span className="text-gray-400 text-xs">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: es })}
          </span>
        </div>
        <p className="text-gray-200 text-sm break-words">{message.content}</p>

        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {message.attachments.map((att: any, i: number) => (
              <div key={i}>
                {att.type === 'image' || att.type === 'gif' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={att.url}
                    alt={att.name}
                    className="max-h-48 max-w-xs rounded object-cover cursor-pointer hover:opacity-90"
                    onClick={() => window.open(att.url, '_blank')}
                  />
                ) : (
                  <a href={att.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-gray-600 rounded px-3 py-2 text-sm text-gray-200 hover:bg-gray-500"
                  >
                    <Paperclip size={14} />
                    <span className="max-w-[200px] truncate">{att.name}</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {isOwn && showActions && (
        <div className="absolute right-2 top-1 flex items-center gap-1 bg-gray-700 rounded shadow px-1 py-0.5">
          <button
            onClick={() => onDelete(message.id)}
            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
            title="Eliminar"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  )
}