import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { channel_id, content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 })

  // Obtener info del canal y servidor
  const { data: channel } = await supabase
    .from('channels')
    .select('id, name, server_id, servers(name)')
    .eq('id', channel_id)
    .single()

  if (!channel) return NextResponse.json({ error: 'Canal no encontrado' }, { status: 404 })

  // Insertar mensaje
  const { data: message, error } = await supabase
    .from('messages')
    .insert({ channel_id, user_id: user.id, content: content.trim() })
    .select(`id, content, profiles(username)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const senderName = (message.profiles as any)?.username ?? 'Alguien'
  const serverName = (channel.servers as any)?.name ?? 'Servidor'

  // Detectar menciones @username
  const mentionRegex = /@(\w+)/g
  const mentions = [...content.matchAll(mentionRegex)].map(m => m[1])

  if (mentions.length > 0) {
    const { data: mentionedUsers } = await supabase
      .from('profiles')
      .select('id, username')
      .in('username', mentions)
      .neq('id', user.id)

    if (mentionedUsers?.length) {
      await supabase.from('notifications').insert(
        mentionedUsers.map(u => ({
          user_id: u.id,
          type: 'mention',
          title: `${senderName} te mencionó en #${channel.name}`,
          body: content,
          server_id: channel.server_id,
          channel_id: channel.id,
        }))
      )
    }
  }

  // Notificar a miembros del servidor (excepto el remitente)
  const { data: members } = await supabase
    .from('members')
    .select('user_id')
    .eq('server_id', channel.server_id)
    .neq('user_id', user.id)

  if (members?.length) {
    await supabase.from('notifications').insert(
      members.map(m => ({
        user_id: m.user_id,
        type: 'message',
        title: `Nuevo mensaje en #${channel.name}`,
        body: `${senderName}: ${content.slice(0, 50)}${content.length > 50 ? '...' : ''}`,
        server_id: channel.server_id,
        channel_id: channel.id,
      }))
    )
  }

  return NextResponse.json({ message })
}