import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Enviar solicitud de amistad
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { username } = await req.json()

  // Buscar usuario por username
  const { data: receiver } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', username)
    .neq('id', user.id)
    .single()

  if (!receiver) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  // Verificar si ya existe una amistad
  const { data: existing } = await supabase
    .from('friendships')
    .select('id, status')
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiver.id}),and(sender_id.eq.${receiver.id},receiver_id.eq.${user.id})`)
    .single()

  if (existing) {
    if (existing.status === 'accepted') {
      return NextResponse.json({ error: 'Ya son amigos' }, { status: 400 })
    }
    if (existing.status === 'pending') {
      return NextResponse.json({ error: 'Ya existe una solicitud pendiente' }, { status: 400 })
    }
  }

  const { error } = await supabase.from('friendships').insert({
    sender_id: user.id,
    receiver_id: receiver.id,
    status: 'pending',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notificar al receptor
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  await supabase.from('notifications').insert({
    user_id: receiver.id,
    type: 'mention',
    title: `${senderProfile?.username} te envió una solicitud de amistad`,
    body: 'Revisá tu lista de amigos para aceptarla',
    server_id: null,
    channel_id: null,
  })

  return NextResponse.json({ success: true })
}