import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type Props = { params: Promise<{ serverId: string }> }

export async function GET(_req: NextRequest, { params }: Props) {
  const { serverId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('server_id', serverId)
    .order('position', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ roles: data })
}

export async function POST(req: NextRequest, { params }: Props) {
  const { serverId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { name, color, permissions } = await req.json()

  // Verificar permisos
  const { data: member } = await supabase
    .from('members')
    .select('role')
    .eq('server_id', serverId)
    .eq('user_id', user.id)
    .single()

  if (!member || !['owner', 'admin'].includes(member.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  // Obtener posición más alta
  const { data: topRole } = await supabase
    .from('roles')
    .select('position')
    .eq('server_id', serverId)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const position = (topRole?.position ?? 0) + 1

  const { data, error } = await supabase
    .from('roles')
    .insert({ server_id: serverId, name, color, permissions, position })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ role: data })
}