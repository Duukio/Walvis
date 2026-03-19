import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type Props = { params: Promise<{ friendshipId: string }> }

// Aceptar o rechazar solicitud
export async function PATCH(req: NextRequest, { params }: Props) {
  const { friendshipId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { status } = await req.json()

  const { error } = await supabase
    .from('friendships')
    .update({ status })
    .eq('id', friendshipId)
    .eq('receiver_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// Eliminar amistad
export async function DELETE(_req: NextRequest, { params }: Props) {
  const { friendshipId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId)
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}