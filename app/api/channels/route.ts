import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { server_id, name, type } = await req.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
  }

  // Verificar que el usuario es admin u owner
  const { data: member } = await supabase
    .from('members')
    .select('role')
    .eq('server_id', server_id)
    .eq('user_id', user.id)
    .single()

  if (!member || !['owner', 'admin'].includes(member.role)) {
    return NextResponse.json({ error: 'No tenés permisos para crear canales' }, { status: 403 })
  }

  const { data: channel, error } = await supabase
    .from('channels')
    .insert({ server_id, name, type })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ channel })
}