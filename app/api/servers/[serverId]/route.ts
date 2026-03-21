import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type Props = { params: Promise<{ serverId: string }> }

// Actualizar servidor (nombre e icono)
export async function PATCH(req: NextRequest, { params }: Props) {
  const { serverId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { name, icon_url, chat_bg_url } = await req.json()

  const { data: member } = await supabase
    .from('members')
    .select('role')
    .eq('server_id', serverId)
    .eq('user_id', user.id)
    .single()

  if (!member || member.role !== 'owner') {
    return NextResponse.json({ error: 'Solo el propietario puede editar el servidor' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('servers')
    .update({ name, icon_url, chat_bg_url })
    .eq('id', serverId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ server: data })
}

// Eliminar servidor
export async function DELETE(_req: NextRequest, { params }: Props) {
  const { serverId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: member } = await supabase
    .from('members')
    .select('role')
    .eq('server_id', serverId)
    .eq('user_id', user.id)
    .single()

  if (!member || member.role !== 'owner') {
    return NextResponse.json({ error: 'Solo el propietario puede eliminar el servidor' }, { status: 403 })
  }

  const { error } = await supabase.from('servers').delete().eq('id', serverId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}