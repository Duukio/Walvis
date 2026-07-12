import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { missingSupabaseEnvMessage, supabasePublishableKey, supabaseUrl } from './env'

export const createClient = async () => {
  const cookieStore = await cookies()
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(missingSupabaseEnvMessage)
  }

  return createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}