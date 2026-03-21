import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type Props = { params: Promise<{ serverId: string; roleId: string }> }

export async function PATCH(req: NextRequest, { params }: Props) {
  const { serverId, roleId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { name, color, permissions, position } = await req.json()

  const { data: member } = await supabase
    .from('members')
    .select('role')
    .eq('server_id', serverId)
    .eq('user_id', user.id)
    .single()

  if (!member || !['owner', 'admin'].includes(member.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('roles')
    .update({ name, color, permissions, position })
    .eq('id', roleId)
    .eq('server_id', serverId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ role: data })
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  const { serverId, roleId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: member } = await supabase
    .from('members')
    .select('role')
    .eq('server_id', serverId)
    .eq('user_id', user.id)
    .single()

  if (!member || !['owner', 'admin'].includes(member.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { error } = await supabase
    .from('roles')
    .delete()
    .eq('id', roleId)
    .eq('server_id', serverId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}