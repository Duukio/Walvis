import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const channelId = req.nextUrl.searchParams.get('channel_id')
  if (!channelId) return NextResponse.json({ error: 'channel_id requerido' }, { status: 400 })

  const { data: messages, error } = await supabase
    .from('messages')
    .select(`
      id,
      content,
      edited,
      attachments,
      created_at,
      user_id,
      profiles (
        username,
        avatar_url
      )
    `)
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { channel_id, content, attachments } = await req.json()

  if (!content?.trim() && (!attachments || attachments.length === 0)) {
    return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 })
  }

  const { data: channel } = await supabase
    .from('channels')
    .select('id, name, server_id, servers(name)')
    .eq('id', channel_id)
    .single()

  if (!channel) return NextResponse.json({ error: 'Canal no encontrado' }, { status: 404 })

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      channel_id,
      user_id: user.id,
      content: content?.trim() || '',
      attachments: attachments ?? null,
    })
    .select(`id, content, attachments, profiles(username)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const senderName = (message.profiles as any)?.username ?? 'Alguien'

  const mentionRegex = /@(\w+)/g
  const mentions = [...(content ?? '').matchAll(mentionRegex)].map((m: any) => m[1])

  if (mentions.length > 0) {
    const { data: mentionedUsers } = await supabase
      .from('profiles')
      .select('id, username')
      .in('username', mentions)
      .neq('id', user.id)

    if (mentionedUsers?.length) {
      await supabase.from('notifications').insert(
        mentionedUsers.map((u: any) => ({
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

  const { data: members } = await supabase
    .from('members')
    .select('user_id')
    .eq('server_id', channel.server_id)
    .neq('user_id', user.id)

  if (members?.length) {
    await supabase.from('notifications').insert(
      members.map((m: any) => ({
        user_id: m.user_id,
        type: 'message',
        title: `Nuevo mensaje en #${channel.name}`,
        body: `${senderName}: ${(content ?? '').slice(0, 50)}${(content ?? '').length > 50 ? '...' : ''}`,
        server_id: channel.server_id,
        channel_id: channel.id,
      }))
    )
  }

  return NextResponse.json({ message })
}