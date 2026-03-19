import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { name, icon_url } = await req.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
  }

  // Crear servidor
  const { data: server, error: serverError } = await supabase
    .from('servers')
    .insert({ name: name.trim(), icon_url, owner_id: user.id })
    .select()
    .single()

  if (serverError) {
    return NextResponse.json({ error: serverError.message }, { status: 500 })
  }

  // Agregar al creador como owner en members
  await supabase.from('members').insert({
    user_id: user.id,
    server_id: server.id,
    role: 'owner'
  })
    // Crear canal general
  await supabase.from('channels').insert([
    { server_id: server.id, name: 'general', type: 'text' },
    { server_id: server.id, name: 'general', type: 'voice' },
  ])

  return NextResponse.json({ server })
}