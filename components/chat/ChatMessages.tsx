'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Pencil, Trash2, Check, X, Paperclip, Reply } from 'lucide-react'
import Image from 'next/image'
import StatusIndicator from '@/components/ui/StatusIndicator'
import UserProfilePopup from '@/components/ui/UserProfilePopup'
import MessageInput from '@/components/chat/MessageInput'

type Message = {
  id: string
  content: string
  created_at: string
  user_id: string
  edited: boolean
  attachments: any[] | null
  reply_to: string | null
  profiles: {
    username: string
    avatar_url: string | null
    status: string
    nickname_color: string
  }
}

export default function ChatMessages({ channelId, serverId }: { channelId: string; serverId: string }) {
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUsername, setCurrentUsername] = useState<string>('')
  const [currentUserRole, setCurrentUserRole] = useState<string>('member')
  const [replyTo, setReplyTo] = useState<{ id: string; username: string; content: string } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()

      if (profile) setCurrentUsername(profile.username)

      const { data: channel } = await supabase
        .from('channels')
        .select('server_id')
        .eq('id', channelId)
        .single()

      if (channel) {
        const { data: member } = await supabase
          .from('members')
          .select('role')
          .eq('server_id', channel.server_id)
          .eq('user_id', user.id)
          .single()

        if (member) setCurrentUserRole(member.role)
      }
    }
    fetchUser()
  }, [channelId])

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          user_id,
          edited,
          reply_to,
          attachments,
          profiles (
            username,
            avatar_url,
            status,
            nickname_color
          )
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })
        .limit(50)

      if (data) setMessages(data as unknown as Message[])
      setLoading(false)
    }

    fetchMessages()
  }, [channelId])

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url, status, nickname_color')
            .eq('id', payload.new.user_id)
            .single()

          const newMessage: Message = {
            ...(payload.new as Message),
            profiles: profile ?? { username: 'Desconocido', avatar_url: null, status: 'online', nickname_color: '#ffffff' },
          }
          setMessages((prev) => [...prev, newMessage])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
        (payload) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.new.id
                ? { ...msg, content: payload.new.content, edited: payload.new.edited, attachments: payload.new.attachments }
                : msg
            )
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [channelId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleEdit = async (id: string, newContent: string) => {
    await supabase.from('messages').update({ content: newContent, edited: true }).eq('id', id)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('messages').delete().eq('id', id)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Cargando mensajes...
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          No hay mensajes todavía. ¡Sé el primero en escribir!
        </div>
        <MessageInput channelId={channelId} replyTo={null} onCancelReply={() => {}} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1">
        {messages.map((msg) => (
          <MessageItem
            key={msg.id}
            message={msg}
            messages={messages}
            isOwn={msg.user_id === currentUserId}
            canDelete={['owner', 'admin'].includes(currentUserRole)}
            currentUsername={currentUsername}
            serverId={serverId}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReply={(msg) => setReplyTo({ id: msg.id, username: msg.profiles.username, content: msg.content })}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Preview de respuesta */}
      {replyTo && (
        <div className="mx-4 mb-1 px-3 py-2 bg-gray-600/50 rounded-t border-l-2 border-indigo-500 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-indigo-400 text-xs font-medium">Respondiendo a {replyTo.username}</p>
            <p className="text-gray-400 text-xs truncate">{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-white ml-2 shrink-0">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

function MessageItem({
  message,
  messages,
  isOwn,
  canDelete,
  currentUsername,
  serverId,
  onEdit,
  onDelete,
  onReply,
}: {
  message: Message
  messages: Message[]
  isOwn: boolean
  canDelete: boolean
  currentUsername: string
  serverId: string
  onEdit: (id: string, content: string) => void
  onDelete: (id: string) => void
  onReply: (message: Message) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [showActions, setShowActions] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)

  const handleConfirmEdit = () => {
    if (editContent.trim() && editContent.trim() !== message.content) {
      onEdit(message.id, editContent.trim())
    }
    setEditing(false)
  }

  const handleCancelEdit = () => {
    setEditContent(message.content)
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleConfirmEdit()
    if (e.key === 'Escape') handleCancelEdit()
  }

  const repliedMessage = message.reply_to ? messages.find(m => m.id === message.reply_to) : null

  return (
    <div
      className="flex items-start gap-3 group hover:bg-gray-600/30 px-2 py-1 rounded transition-colors relative"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div className="relative shrink-0 mt-0.5" ref={avatarRef}>
        <div
          className="w-10 h-10 rounded-full overflow-hidden cursor-pointer"
          onClick={() => setShowProfile(true)}
        >
          {message.profiles?.avatar_url ? (
            <Image
              src={message.profiles.avatar_url}
              alt={message.profiles.username}
              width={40}
              height={40}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white">
              {message.profiles?.username?.slice(0, 2).toUpperCase() ?? '??'}
            </div>
          )}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 border-2 border-gray-700 rounded-full">
          <StatusIndicator
            userId={message.user_id}
            initialStatus={message.profiles?.status as any ?? 'online'}
          />
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        {/* Preview de respuesta */}
        {repliedMessage && (
          <div className="flex items-center gap-2 mb-1 pl-2 border-l-2 border-indigo-500/50 cursor-pointer hover:border-indigo-400">
            <p className="text-indigo-400 text-xs font-medium shrink-0">
              {repliedMessage.profiles?.username}
            </p>
            <p className="text-gray-400 text-xs truncate">{repliedMessage.content}</p>
          </div>
        )}

        <div className="flex items-baseline gap-2">
          <span
            className="font-medium text-sm cursor-pointer hover:underline"
            style={{ color: message.profiles?.nickname_color ?? '#ffffff' }}
            onClick={() => setShowProfile(true)}
          >
            {message.profiles?.username ?? 'Desconocido'}
          </span>
          <span className="text-gray-400 text-xs">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: es })}
          </span>
          {message.edited && (
            <span className="text-gray-500 text-xs">(editado)</span>
          )}
        </div>

        {editing ? (
          <div className="flex items-center gap-2 mt-1">
            <input
              type="text"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="flex-1 bg-gray-600 text-gray-200 text-sm px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button onClick={handleConfirmEdit} className="text-green-400 hover:text-green-300 transition-colors" title="Confirmar">
              <Check size={16} />
            </button>
            <button onClick={handleCancelEdit} className="text-red-400 hover:text-red-300 transition-colors" title="Cancelar">
              <X size={16} />
            </button>
          </div>
        ) : (
          <MessageContent content={message.content} currentUsername={currentUsername} />
        )}

        {/* Adjuntos */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {message.attachments.map((att: any, i: number) => (
              <div key={i}>
                {att.type === 'image' || att.type === 'gif' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={att.url}
                    alt={att.name}
                    className="max-h-48 max-w-xs rounded object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(att.url, '_blank')}
                  />
                ) : (
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-gray-600 rounded px-3 py-2 text-sm text-gray-200 hover:bg-gray-500 transition-colors"
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

      {/* Botones de acción */}
      {showActions && !editing && (
        <div className="absolute right-2 top-1 flex items-center gap-1 bg-gray-700 rounded shadow px-1 py-0.5">
          <button
            onClick={() => onReply(message)}
            className="p-1 text-gray-400 hover:text-indigo-400 transition-colors"
            title="Responder"
          >
            <Reply size={13} />
          </button>
          {isOwn && (
            <button onClick={() => setEditing(true)} className="p-1 text-gray-400 hover:text-white transition-colors" title="Editar">
              <Pencil size={13} />
            </button>
          )}
          {(isOwn || canDelete) && (
            <button onClick={() => onDelete(message.id)} className="p-1 text-gray-400 hover:text-red-400 transition-colors" title="Eliminar">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )}

      {/* Popup de perfil */}
      {showProfile && (
        <UserProfilePopup
          userId={message.user_id}
          serverId={serverId}
          onClose={() => setShowProfile(false)}
          anchorRef={avatarRef as React.RefObject<HTMLElement>}
        />
      )}
    </div>
  )
}

function MessageContent({
  content,
  currentUsername,
}: {
  content: string
  currentUsername: string
}) {
  if (!content) return null

  const parts = content.split(/(@everyone|@\w+)/g)

  return (
    <p className="text-gray-200 text-sm break-words">
      {parts.map((part, i) => {
        if (part === '@everyone') {
          return (
            <span key={i} className="bg-indigo-500/30 text-indigo-300 rounded px-0.5 font-medium">
              @everyone
            </span>
          )
        }

        if (part.startsWith('@') && part.slice(1).toLowerCase() === currentUsername.toLowerCase()) {
          return (
            <span key={i} className="bg-indigo-500/30 text-indigo-300 rounded px-0.5 font-medium">
              {part}
            </span>
          )
        }

        if (part.startsWith('@')) {
          return (
            <span key={i} className="text-indigo-400 font-medium">
              {part}
            </span>
          )
        }

        return <span key={i}>{part}</span>
      })}
    </p>
  )
}