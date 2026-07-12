import { createBrowserClient } from '@supabase/ssr'
import { missingSupabaseEnvMessage, supabasePublishableKey, supabaseUrl } from './env'

export const createClient = () => {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(missingSupabaseEnvMessage)
  }

  return createBrowserClient(supabaseUrl, supabasePublishableKey)
}
