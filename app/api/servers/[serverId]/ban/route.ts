import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type Props = { params: Promise<{ serverId: string }> }

export async function POST(req: NextRequest, { params }: Props) {
  const { serverId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { user_id } = await req.json()

  const { data: actor } = await supabase
    .from('members')
    .select('role')
    .eq('server_id', serverId)
    .eq('user_id', user.id)
    .single()

  if (!actor || !['owner', 'admin'].includes(actor.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  // Kickear primero
  await supabase.from('members').delete()
    .eq('server_id', serverId).eq('user_id', user_id)

  // Banear
  const { error } = await supabase.from('banned_members').insert({
    user_id,
    server_id: serverId,
    banned_by: user.id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}