import { StreamClient } from '@stream-io/node-sdk'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY
    const secret = process.env.STREAM_SECRET_KEY


    if (!apiKey || !secret) {
      return NextResponse.json({ error: 'Keys de Stream no configuradas' }, { status: 500 })
    }

    const streamClient = new StreamClient(apiKey, secret)
    const token = streamClient.generateUserToken({ user_id: user.id })

    return NextResponse.json({ token })
  } catch (err) {
    console.error('Error generando token:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}