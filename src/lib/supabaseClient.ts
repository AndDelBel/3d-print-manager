import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

// Global variables to store instances
let supabaseInstance: SupabaseClient | null = null
let supabaseAdminInstance: SupabaseClient | null = null

// Function to create client with proper configuration
function createSupabaseClient() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Use a unique storage key to avoid conflicts
      storageKey: '3d-print-manager-supabase-auth'
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-js/2.x'
      }
    }
  })
}

// Client for browser operations - singleton pattern
export const supabase = (() => {
  // In browser environment, check window first
  if (typeof window !== 'undefined') {
    if ((window as any).__supabaseClient) {
      return (window as any).__supabaseClient
    }
    
    if (!supabaseInstance) {
      supabaseInstance = createSupabaseClient()
      // Store in window to prevent multiple instances
      (window as any).__supabaseClient = supabaseInstance
    }
    return supabaseInstance
  }
  
  // Server-side: create new instance each time
  return createSupabaseClient()
})()

// Admin client for server-side operations
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