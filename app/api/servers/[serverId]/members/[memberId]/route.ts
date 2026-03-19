import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type Props = { params: Promise<{ serverId: string; memberId: string }> }

// Cambiar rol o kickear
export async function PATCH(req: NextRequest, { params }: Props) {
  const { serverId, memberId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { role } = await req.json()

  // Verificar que quien hace la acción es owner o admin
  const { data: actor } = await supabase
    .from('members')
    .select('role')
    .eq('server_id', serverId)
    .eq('user_id', user.id)
    .single()

  if (!actor || !['owner', 'admin'].includes(actor.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  // No se puede cambiar el rol del owner
  const { data: target } = await supabase
    .from('members')
    .select('role')
    .eq('server_id', serverId)
    .eq('user_id', memberId)
    .single()

  if (target?.role === 'owner') {
    return NextResponse.json({ error: 'No se puede modificar al propietario' }, { status: 403 })
  }

  const { error } = await supabase
    .from('members')
    .update({ role })
    .eq('server_id', serverId)
    .eq('user_id', memberId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// Kickear miembro
export async function DELETE(_req: NextRequest, { params }: Props) {
  const { serverId, memberId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: actor } = await supabase
    .from('members')
    .select('role')
    .eq('server_id', serverId)
    .eq('user_id', user.id)
    .single()

  if (!actor || !['owner', 'admin'].includes(actor.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { data: target } = await supabase
    .from('members')
    .select('role')
    .eq('server_id', serverId)
    .eq('user_id', memberId)
    .single()

  if (target?.role === 'owner') {
    return NextResponse.json({ error: 'No se puede kickear al propietario' }, { status: 403 })
  }

  const { error } = await supabase
    .from('members')
    .delete()
    .eq('server_id', serverId)
    .eq('user_id', memberId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}