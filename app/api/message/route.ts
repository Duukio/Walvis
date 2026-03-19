import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const channelId = req.nextUrl.searchParams.get('channel_id')
  if (!channelId) return NextResponse.json({ error: 'channel_id requerido' }, { status: 400 })

  const { data: messages, error } = await supabase
    .from('messages')
    .select(`
      id,
      content,
      edited,
      created_at,
      user_id,
      profiles (
        username,
        avatar_url
      )
    `)
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ messages })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { channel_id, content } = await req.json()

  if (!content?.trim()) {
    return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 400 })
  }

  const { data: message, error } = await supabase
    .from('messages')
    .insert({ channel_id, user_id: user.id, content: content.trim() })
    .select(`
      id,
      content,
      edited,
      created_at,
      user_id,
      profiles (
        username,
        avatar_url
      )
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ message })
}