import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const receiverId = req.nextUrl.searchParams.get('receiver_id')
  if (!receiverId) return NextResponse.json({ error: 'receiver_id requerido' }, { status: 400 })

  const { data, error } = await supabase
    .from('direct_messages')
    .select(`
      id,
      content,
      attachments,
      edited,
      created_at,
      sender_id,
      receiver_id,
      sender:profiles!direct_messages_sender_id_fkey (
        username, avatar_url, nickname_color, status
      )
    `)
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { receiver_id, content, attachments } = await req.json()

  if (!content?.trim() && (!attachments || attachments.length === 0)) {
    return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('direct_messages')
    .insert({
      sender_id: user.id,
      receiver_id,
      content: content?.trim() || '',
      attachments: attachments ?? null,
    })
    .select(`
      id, content, attachments, edited, created_at, sender_id, receiver_id,
      sender:profiles!direct_messages_sender_id_fkey (
        username, avatar_url, nickname_color, status
      )
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notificar al receptor
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  await supabase.from('notifications').insert({
    user_id: receiver_id,
    type: 'mention',
    title: `${senderProfile?.username} te envió un mensaje`,
    body: content?.slice(0, 50) ?? '',
    server_id: null,
    channel_id: null,
  })

  return NextResponse.json({ message: data })
}