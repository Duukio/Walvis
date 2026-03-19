import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { invite_code } = await req.json()

  const { data: server, error } = await supabase
    .from('servers')
    .select('id, name')
    .eq('invite_code', invite_code)
    .single()

  if (error || !server) {
    return NextResponse.json({ error: 'Código de invitación inválido' }, { status: 404 })
  }

  // Verificar si ya es miembro
  const { data: existing } = await supabase
    .from('members')
    .select('id')
    .eq('user_id', user.id)
    .eq('server_id', server.id)
    .single()

  if (existing) {
    return NextResponse.json({ server_id: server.id })
  }

  // Unirse
  await supabase.from('members').insert({
    user_id: user.id,
    server_id: server.id,
    role: 'member',
  })

  // Notificar a miembros existentes
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  const { data: existingMembers } = await supabase
    .from('members')
    .select('user_id')
    .eq('server_id', server.id)
    .neq('user_id', user.id)

  if (existingMembers?.length && profile) {
    await supabase.from('notifications').insert(
      existingMembers.map(m => ({
        user_id: m.user_id,
        type: 'member_join',
        title: `${profile.username} se unió a ${server.name}`,
        body: 'Un nuevo miembro se unió a tu servidor',
        server_id: server.id,
        channel_id: null,
      }))
    )
  }

  return NextResponse.json({ server_id: server.id })
}