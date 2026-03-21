import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type Props = { params: Promise<{ serverId: string; memberId: string }> }

export async function POST(req: NextRequest, { params }: Props) {
  const { serverId, memberId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { role_id } = await req.json()

  const { error } = await supabase
    .from('member_roles')
    .insert({ user_id: memberId, server_id: serverId, role_id })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: Props) {
  const { serverId, memberId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { role_id } = await req.json()

  const { error } = await supabase
    .from('member_roles')
    .delete()
    .eq('user_id', memberId)
    .eq('server_id', serverId)
    .eq('role_id', role_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}