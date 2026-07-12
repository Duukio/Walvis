export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const hasSupabaseEnv = () => Boolean(supabaseUrl && supabasePublishableKey)

export const missingSupabaseEnvMessage =
  'Faltan variables de Supabase. Configura NEXT_PUBLIC_SUPABASE_URL y una clave pública: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY o NEXT_PUBLIC_SUPABASE_ANON_KEY. Luego vuelve a desplegar en Vercel.'
