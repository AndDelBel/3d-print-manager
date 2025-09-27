import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

// Singleton pattern per evitare multiple istanze
let supabaseInstance: SupabaseClient | null = null
let supabaseAdminInstance: SupabaseClient | null = null

export const supabase = (() => {
  if (!supabaseInstance) {
    // Check if we're in browser environment to avoid multiple instances
    if (typeof window !== 'undefined' && (window as any).__supabaseClient) {
      return (window as any).__supabaseClient;
    }
    
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      // Configurazione per evitare errori 404
      global: {
        headers: {
          'X-Client-Info': 'supabase-js/2.x'
        }
      }
    });
    
    // Store in window for browser environment to prevent multiple instances
    if (typeof window !== 'undefined') {
      (window as any).__supabaseClient = supabaseInstance;
    }
  }
  return supabaseInstance
})()

// Client per operazioni server-side
export const supabaseAdmin = (() => {
  if (!supabaseAdminInstance) {
    supabaseAdminInstance = createClient(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  }
  return supabaseAdminInstance
})()